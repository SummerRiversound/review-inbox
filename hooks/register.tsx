import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { InboxFile, InboxItem, InboxStatus, IssueItem, MyPr, Tab } from '../types'
import {
  CLAIM_MS,
  cacheKey,
  INBOX_QUERY,
  RETRY_MS,
  SINCE_RULES,
  SUMMARY_RULES,
  ageColor,
  failedSummary,
  isHidden,
  itemKey,
  lastReviewedSha,
  minutesAgo,
  newArrivals,
  parseSummary,
  requestedAt,
  requestedVia,
  reusableSummary,
  reviewPrompt,
  searchQuery,
  shouldFetch,
  shownReady,
  sincePrompt,
  sortItems,
  summaryPrompt,
  toDetail,
  waitingDays,
} from './inbox'
import type { GqlPr, PrDetail, SearchHit, Summary } from './inbox'
import {
  REFERENCES_QUERY,
  AUTHORED_DAYS,
  REFERENCE_DAYS,
  STATE_LABEL,
  TABS_QUERY,
  bandCounts,
  issueAlerts,
  issueKey,
  prAlertText,
  prAlerts,
  prSeenKeys,
  reviewers,
  referencesQuery,
  stateColor,
  tabQueries,
  toIssues,
  toMyPrs,
  toReferences,
} from './tabs'
import type { GqlMyPr, GqlReferenced, GqlTouched } from './tabs'

const PANE = 'review-inbox'
const TITLE = '리뷰 인박스'
// Reading the shared file is a local disk read, so every session can afford it often.
const SYNC_MS = 30_000
const SUMMARY_MODEL = 'sonnet'
const MODEL_TIMEOUT_MS = 60_000

const items = atom({ plugin: 'review-inbox', key: 'items' } as const, [] as InboxItem[])
const status = atom({ plugin: 'review-inbox', key: 'status' } as const, {
  kind: 'idle',
} as InboxStatus)
const hidden = atom({ plugin: 'review-inbox', key: 'hidden' } as const, {} as Record<string, string>)
const mine = atom({ plugin: 'review-inbox', key: 'mine' } as const, [] as MyPr[])
const issues = atom({ plugin: 'review-inbox', key: 'issues' } as const, [] as IssueItem[])
const tab = atom({ plugin: 'review-inbox', key: 'tab' } as const, 'review' as Tab)

type Options = { scope?: string; githubUser?: string }

let config = { scope: '', githubUser: '' }
let isFetching = false
let terminalColumns = 160
// What this session has already shown; undefined until its first look, so a new session stays quiet.
let shownKeys: string[] | undefined
let shownPrKeys: string[] | undefined
let shownIssueKeys: string[] | undefined
// A button's or a command's dispatch ends before a fetch would, so they only ask; the session's timer does it.
let wanted: 'sync' | 'fetch' | undefined
const sessionToken = Math.random().toString(36).slice(2)

// Claude Code's per-plugin data folder; a mod is not told its id, so it falls back to a fixed name there.
async function cacheDir($: EngineInterface) {
  const pluginData = await $.env.get('CLAUDE_PLUGIN_DATA')
  if (pluginData) return pluginData
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  const configDir = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? (home ? `${home}/.claude` : undefined)
  // Without it a relative path would land inside whatever repo the session is in.
  if (!configDir) throw new Error('neither HOME nor USERPROFILE is set')
  return `${configDir}/plugins/data/review-inbox`
}

// undefined when the file exists but does not parse: another session is mid-write, so skip this look.
async function readJson<T>($: EngineInterface, name: string, missing: T): Promise<T | undefined> {
  const path = `${await cacheDir($)}/${name}`
  if (!(await $.fs.exists(path))) return missing
  try {
    return JSON.parse(await $.fs.read(path)) as T
  } catch {
    return undefined
  }
}

async function writeJson($: EngineInterface, name: string, value: unknown) {
  await $.fs.write(`${await cacheDir($)}/${name}`, JSON.stringify(value))
}

// One shared file per account and scope, so sessions configured differently never overwrite each other.
const inboxFile = () => `inbox-${cacheKey(config.githubUser, config.scope)}.json`
const hiddenFile = () => `hidden-${cacheKey(config.githubUser, config.scope)}.json`

async function gh($: EngineInterface, args: string[], env: Record<string, string>) {
  const run = await $.process.run(['gh', ...args], { env, timeoutMs: 120_000 })
  if (run.exitCode !== 0) throw new Error(run.stderr.trim().split('\n')[0] || `gh ${args[0]} failed`)
  if (run.isStdoutTruncated) throw new Error(`gh ${args[0]} output too large`)
  return run.stdout
}

async function ask($: EngineInterface, rules: string, prompt: string, maxTokens: number) {
  try {
    // Rules go first in `prompt`, marked: that is where every provider's prompt cache finds them.
    const reply = await $.model.complete({
      model: SUMMARY_MODEL,
      prompt: [{ text: rules, cache: true }, { text: prompt }],
      maxTokens,
      timeoutMs: MODEL_TIMEOUT_MS,
    })
    return reply.isAnswered ? { text: reply.text } : { reason: reply.reason }
  } catch (error) {
    // A model this setup blocks rejects instead of answering.
    return { reason: error instanceof Error ? error.message : String(error) }
  }
}

async function summarize(
  $: EngineInterface,
  hit: SearchHit,
  detail: PrDetail,
  prev: InboxItem | undefined,
): Promise<Summary> {
  const reply = await ask($, SUMMARY_RULES, summaryPrompt(hit, detail), 800)
  const parsed = reply.text !== undefined ? parseSummary(reply.text) : undefined
  return parsed ?? failedSummary(hit.title, reply.reason ?? 'unreadable reply', prev, detail.headRefOid)
}

// A failed comparison (a force-push rewrote the reviewed commit) just leaves the line out.
async function summarizeSince(
  $: EngineInterface,
  repo: string,
  from: string,
  to: string,
  env: Record<string, string>,
): Promise<string | undefined> {
  try {
    const diff = JSON.parse(
      await gh(
        $,
        ['api', `repos/${repo}/compare/${from}...${to}`, '--jq',
          '{commits: [.commits[].commit.message], files: [.files[].filename]}'],
        env,
      ),
    ) as { commits: string[]; files: string[] }
    const reply = await ask($, SINCE_RULES, sincePrompt(diff.commits, diff.files), 300)
    return reply.text?.trim() || undefined
  } catch {
    return undefined
  }
}

async function ghEnv($: EngineInterface): Promise<Record<string, string>> {
  if (!config.githubUser) return {}
  return { GH_TOKEN: (await gh($, ['auth', 'token', '-u', config.githubUser], {})).trim() }
}

async function fetchTabs(
  $: EngineInterface,
  env: Record<string, string>,
  previous: IssueItem[],
): Promise<{ mine: MyPr[]; issues: IssueItem[] }> {
  const q = tabQueries(config.scope)
  const data = JSON.parse(
    await gh(
      $,
      ['api', 'graphql', '-f', `query=${TABS_QUERY}`, '-f', `mine=${q.mine}`, '-f', `assigned=${q.assigned}`,
        '-f', `mentioned=${q.mentioned}`, '--jq', '.data'],
      env,
    ),
  ) as {
    viewer: { login: string }
    mine: { nodes: Partial<GqlMyPr>[] }
    assigned: { nodes: Partial<GqlTouched>[] }
    mentioned: { nodes: Partial<GqlTouched>[] }
  }
  const real = <T,>(nodes: Partial<T & { number: number }>[]) =>
    nodes.filter((n): n is T & { number: number } => typeof n.number === 'number')

  const since = new Date(Date.now() - REFERENCE_DAYS * 86_400_000).toISOString()
  const touchedSince = new Date(Date.now() - AUTHORED_DAYS * 86_400_000).toISOString()
  let references: IssueItem[]
  try {
    const referenced: GqlReferenced[] = []
    let after: string | undefined
    // ponytail: at most 10 pages (500 items touched in the window, newest first); past that the rest are left out
    for (let page = 0; page < 10; page++) {
      const result = JSON.parse(
        await gh(
          $,
          ['api', 'graphql', '-f', `query=${REFERENCES_QUERY}`, '-f', `q=${referencesQuery(config.scope, touchedSince)}`,
            '-f', `since=${since}`, ...(after ? ['-f', `after=${after}`] : []), '--jq', '.data.search'],
          env,
        ),
      ) as { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: Partial<GqlReferenced>[] }
      referenced.push(...real<GqlReferenced>(result.nodes))
      if (!result.pageInfo.hasNextPage) break
      after = result.pageInfo.endCursor
    }
    references = toReferences(referenced, data.viewer.login)
  } catch {
    // References are the costliest search; when GitHub refuses it, keep the last ones instead of failing every tab.
    references = previous.filter(i => i.kind === 'reference')
  }

  return {
    mine: toMyPrs(real<GqlMyPr>(data.mine.nodes), data.viewer.login),
    issues: toIssues(real<GqlTouched>(data.assigned.nodes), real<GqlTouched>(data.mentioned.nodes), references),
  }
}

async function fetchInbox(
  $: EngineInterface,
  env: Record<string, string>,
  previous: InboxItem[],
  heartbeat: () => Promise<void>,
): Promise<InboxItem[]> {
  const data = JSON.parse(
    await gh(
      $,
      ['api', 'graphql', '-f', `query=${INBOX_QUERY}`,
        '-f', `q=${searchQuery(config.scope)}`, '--jq', '.data | .search.nodes |= map(if .body then .body |= .[:12000] else . end)'],
      env,
    ),
  ) as { viewer: { login: string }; search: { nodes: Partial<GqlPr>[] } }
  const me = data.viewer.login
  // Search can return non-PR nodes as empty objects.
  const prs = data.search.nodes.filter((n): n is GqlPr => typeof n.number === 'number')
  const before = new Map(previous.map(i => [itemKey(i), i]))

  const next: InboxItem[] = []
  // ponytail: fixed batches of 3 model calls; a work queue only matters past a few dozen PRs
  for (let i = 0; i < prs.length; i += 3) {
    const batch = await Promise.all(
      prs.slice(i, i + 3).map(async pr => {
        const repo = pr.repository.nameWithOwner
        const prev = before.get(`${repo}#${pr.number}`)
        const detail = toDetail(pr)
        const head = pr.headRefOid
        const summary = reusableSummary(prev, head) ?? (await summarize($, pr, detail, prev))
        const reviewedSha = lastReviewedSha(detail.reviews, me)
        const sinceLastReview =
          !reviewedSha || reviewedSha === head
            ? undefined
            : prev?.headSha === head && prev.reviewedSha === reviewedSha
              ? prev.sinceLastReview
              : await summarizeSince($, pr.repository.nameWithOwner, reviewedSha, head, env)
        return {
          repo,
          number: pr.number,
          title: pr.title,
          url: pr.url,
          headSha: head,
          isRerequest: reviewedSha !== undefined,
          ...(reviewedSha ? { reviewedSha } : {}),
          ...(sinceLastReview ? { sinceLastReview } : {}),
          author: pr.author?.login ?? 'ghost',
          createdAt: pr.createdAt,
          requestedAt: requestedAt(pr, me),
          isDraft: pr.isDraft,
          via: requestedVia(detail.reviewRequests, me),
          files: pr.changedFiles,
          additions: pr.additions,
          deletions: pr.deletions,
          ...summary,
        } satisfies InboxItem
      }),
    )
    next.push(...batch)
    await heartbeat()
  }
  return sortItems(next)
}

// Every session runs this; only the one that finds the shared file stale and wins the claim goes to GitHub.
async function sync($: EngineInterface, force = false) {
  const file = await readJson<InboxFile>($, inboxFile(), { items: [] })
  if (file === undefined) return
  if (isFetching || !shouldFetch(file, Date.now(), force)) return show($, file)

  isFetching = true
  try {
    // Sessions started together all see the file stale; the last claim written wins, the others back off.
    const claim = { ...file, fetchingSince: Date.now(), fetchingBy: sessionToken }
    await writeJson($, inboxFile(), claim)
    await $.clock.sleep(500)
    const settled = await readJson<InboxFile>($, inboxFile(), { items: [] })
    if (settled?.fetchingBy !== sessionToken) return
    await show($, claim)

    let result: InboxFile
    try {
      const env = await ghEnv($)
      const tabs = await fetchTabs($, env, file.issues ?? [])
      const fetched = await fetchInbox($, env, file.items, () =>
        writeJson($, inboxFile(), { ...claim, fetchingSince: Date.now() }),
      )
      result = { items: fetched, ...tabs, fetchedAt: Date.now() }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Keep the last good list and try again in a minute, not after a full refresh interval.
      result = { items: file.items, mine: file.mine, issues: file.issues, fetchedAt: file.fetchedAt ?? Date.now(), retryAt: Date.now() + RETRY_MS, error: message }
    }
    await writeJson($, inboxFile(), result)
    await show($, result)
  } finally {
    isFetching = false
  }
}

async function show($: EngineInterface, file: InboxFile) {
  const claimed = file.fetchingSince !== undefined && Date.now() - file.fetchingSince < CLAIM_MS
  // A file written by an older version of the mod, in this or another session, lacks newer fields;
  // a missing list keeps what is shown rather than blanking a tab.
  const prs = file.mine?.map(pr => ({ ...pr, newReviews: pr.newReviews ?? [] }))
  const issueList = file.issues
  await update($, items, () => file.items)
  if (prs) await update($, mine, () => prs)
  if (issueList) await update($, issues, () => issueList)
  await update($, status, () =>
    claimed
      ? { kind: 'loading' as const, updatedAt: file.fetchedAt }
      : file.error
        ? { kind: 'error' as const, message: file.error, updatedAt: file.fetchedAt }
        : { kind: 'ready' as const, updatedAt: file.fetchedAt },
  )
  const hiddenNow = await readJson<Record<string, string>>($, hiddenFile(), {})
  if (hiddenNow !== undefined) await update($, hidden, () => hiddenNow)

  // An empty file from before the first fetch, or an error result, must not become the baseline, or everything reads as new.
  if (claimed || file.fetchedAt === undefined || file.error !== undefined) return
  const fresh = newArrivals(shownKeys, file.items)
  for (const item of fresh.slice(0, 3)) {
    $.ui.toast(`새 리뷰 요청 · ${item.repo} #${item.number} · ${item.summary}`)
  }
  if (fresh.length > 3) $.ui.toast(`새 리뷰 요청이 ${fresh.length - 3}건 더 있습니다`)
  shownKeys = shownReady(file.items)

  if (prs) {
    const prNews = prAlerts(shownPrKeys, prs)
    for (const alert of prNews.slice(0, 3)) $.ui.toast(prAlertText(alert))
    if (prNews.length > 3) $.ui.toast(`내 PR 알림이 ${prNews.length - 3}건 더 있습니다`)
    shownPrKeys = prSeenKeys(prs)
  }
  if (issueList) {
    const newIssues = issueAlerts(shownIssueKeys, issueList)
    for (const issue of newIssues.slice(0, 3)) {
      $.ui.toast(`${ISSUE_LABEL[issue.kind]} · ${issue.repo} #${issue.number} · ${issue.title}`)
    }
    if (newIssues.length > 3) $.ui.toast(`내 이슈 알림이 ${newIssues.length - 3}건 더 있습니다`)
    shownIssueKeys = issueList.map(issueKey)
  }
}

const ISSUE_LABEL: Record<IssueItem['kind'], string> = {
  assigned: '나에게 할당',
  mention: '나를 언급',
  reference: '내 작업을 언급',
}

async function openDrawer($: EngineInterface) {
  await $.ui.open({
    id: PANE,
    title: TITLE,
    focus: true,
    closeOnEscape: true,
    columns: Math.max(60, Math.floor(terminalColumns / 2)),
    // Inline (not fullscreen) the pane opens a third tall by default: one card. Ask for what the layout spares.
    rows: 200,
  })
}

async function startReview($: EngineInterface, item: InboxItem) {
  const { text } = await $.prompt.read()
  const filled = await $.prompt.fill({ text: reviewPrompt(text, item), mode: 'append' })
  if (!filled.isFilled) {
    $.ui.toast('입력창을 지금 쓸 수 없습니다. 열린 창을 닫고 다시 눌러 주세요.')
    return
  }
  await $.ui.close({ id: PANE })
}

// Read-modify-write on its own file, so a hide never races a fetch rewriting the inbox.
async function setHidden($: EngineInterface, change: (h: Record<string, string>) => Record<string, string>) {
  const current = await readJson<Record<string, string>>($, hiddenFile(), {})
  if (current === undefined) {
    $.ui.toast('잠시 후 다시 눌러 주세요.')
    return
  }
  const live = new Set((await read($, items)).map(itemKey))
  const next = Object.fromEntries(Object.entries(change(current)).filter(([key]) => live.has(key)))
  await writeJson($, hiddenFile(), next)
  await update($, hidden, () => next)
}

export const register: Register = (on, options) => {
  const opts = options as Options
  config = { scope: (opts.scope ?? '').trim(), githubUser: (opts.githubUser ?? '').trim() }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'review-inbox', description: 'Open the review inbox: PRs awaiting my review, my PRs and my issues' })
    // Spread sessions opened together so they do not all find the file stale in the same second.
    $.clock.after(1_000 + Math.floor(Math.random() * 4_000), () => void sync($))
    $.clock.every(SYNC_MS, () => void sync($))
    $.clock.every(1_000, () => {
      if (!wanted) return
      const force = wanted === 'fetch'
      wanted = undefined
      void sync($, force)
    })
    return next(e)
  })

  on('command.run', { command: 'review-inbox' }, async ($, e) => {
    terminalColumns = e.presentation.columns
    await openDrawer($)
    wanted ??= 'sync'
    return { text: `${TITLE} 목록을 열었습니다.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.viewport) terminalColumns = e.viewport.columns
    if (e.props.hasSurvey) return next(e)
    const hiddenMap = await read($, hidden)
    const reviews = (await read($, items)).filter(i => !i.isDraft && !isHidden(hiddenMap, i))
    const counts = bandCounts(reviews.length, await read($, mine), await read($, issues))
    if (counts.length === 0) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const now = Date.now()
    const oldest = reviews.length > 0 ? Math.max(...reviews.map(i => waitingDays(i.requestedAt, now))) : undefined

    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row">
          <Text color={oldest === undefined ? 'subtle' : ageColor(oldest)}>▌ </Text>
          <Text bold>{counts.join(' · ')}</Text>
          {oldest !== undefined && <Text dimColor> · 가장 오래된 리뷰 {oldest}일째</Text>}
        </Box>
        <Button key="open" label="열기" variant="primary" onPress={() => void openDrawer($)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const hiddenMap = await read($, hidden)
    const everything = await read($, items)
    const list = everything.filter(i => !isHidden(hiddenMap, i))
    const hiddenCount = everything.length - list.length
    const state = await read($, status)
    const now = Date.now()
    const ready = list.filter(i => !i.isDraft)
    const drafts = list.filter(i => i.isDraft)
    const active = await read($, tab)
    const myPrs = await read($, mine)
    const myIssues = await read($, issues)

    const card = (item: InboxItem) => {
      const days = waitingDays(item.requestedAt, now)
      return (
        <Box key={`card-${item.repo}-${item.number}`} flexDirection="row" marginBottom={1}>
          <Box width={1} flexShrink={0} backgroundColor={item.isDraft ? 'inactive' : ageColor(days)} />
          <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text bold>
                {item.repo} #{item.number}
                {item.isRerequest && <Text color="suggestion"> 재요청</Text>}
              </Text>
              <Text dimColor>
                <Text color={item.isDraft ? 'inactive' : days >= 3 ? ageColor(days) : undefined}>
                  {days}일째
                </Text>
                {' · '}
                {item.via}
              </Text>
            </Box>
            <Text dimColor wrap="truncate-end">
              <Link href={item.url}>{item.title} ↗</Link>
            </Text>

            {item.sinceLastReview && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="suggestion">지난 내 리뷰 이후</Text>
                <Text>{item.sinceLastReview}</Text>
              </Box>
            )}
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>요약</Text>
              <Text bold>{item.summary}</Text>
            </Box>
            {item.why && (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>PR 이유</Text>
                <Text>{item.why}</Text>
              </Box>
            )}
            {item.impact.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>영향 범위</Text>
                {item.impact.map(i =>
                  i.warn ? (
                    <Text color="warning">⚠️ {i.text}</Text>
                  ) : (
                    <Text>· {i.text}</Text>
                  ),
                )}
              </Box>
            )}

            <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
              <Text dimColor>
                {item.author} · 파일 {item.files}개 (+{item.additions.toLocaleString()} −
                {item.deletions.toLocaleString()})
              </Text>
              <Box flexDirection="row" gap={1}>
                <Button
                  key={`hide-${item.repo}-${item.number}`}
                  label="숨기기"
                  dimColor
                  onPress={() => void setHidden($, h => ({ ...h, [itemKey(item)]: item.headSha }))}
                />
                <Button
                  key={`review-${item.repo}-${item.number}`}
                  label="리뷰하기"
                  variant="primary"
                  onPress={() => void startReview($, item)}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      )
    }

    const prCard = (pr: MyPr) => (
      <Box key={`pr-${pr.url}`} flexDirection="row" marginBottom={1}>
        <Box width={1} flexShrink={0} backgroundColor={stateColor(pr.state)} />
        <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold>
              {pr.repo} #{pr.number}
            </Text>
            <Text>
              <Text color={stateColor(pr.state)} bold={pr.state !== 'waiting'}>
                {STATE_LABEL[pr.state]}
              </Text>
              <Text dimColor>
                {pr.ciPending ? ' · CI 진행 중' : ''} · {waitingDays(pr.createdAt, now)}일째
              </Text>
            </Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            <Link href={pr.url}>{pr.title} ↗</Link>
          </Text>
          {pr.newReviews.length > 0 && (
            <Text color="suggestion" wrap="truncate-end">
              새 리뷰 · {reviewers(pr)}
            </Text>
          )}
        </Box>
      </Box>
    )

    const issueCard = (issue: IssueItem) => (
      <Box key={`issue-${issueKey(issue)}`} flexDirection="row" marginBottom={1}>
        <Box width={1} flexShrink={0} backgroundColor={issue.kind === 'reference' ? 'inactive' : 'suggestion'} />
        <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold>
              {issue.repo} #{issue.number}
            </Text>
            <Text dimColor>
              {ISSUE_LABEL[issue.kind]} · {waitingDays(issue.at, now)}일 전
            </Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            <Link href={issue.url}>{issue.title} ↗</Link>
          </Text>
          {issue.kind === 'reference' && (
            <Text dimColor>
              {issue.by}님이 내 {issue.target}을(를) 언급
            </Text>
          )}
        </Box>
      </Box>
    )

    const statusLine =
      state.kind === 'loading'
        ? '불러오는 중…'
        : state.kind === 'error'
          ? `불러오지 못해 1분 뒤 다시 시도합니다 (${state.message ?? ''})`
          : minutesAgo(state.updatedAt, now) ?? ''

    const references = myIssues.filter(i => i.kind === 'reference')
    const direct = myIssues.filter(i => i.kind !== 'reference')
    const tabs: { id: Tab; label: string }[] = [
      { id: 'review', label: `리뷰 대기 ${ready.length}` },
      { id: 'mine', label: `내 PR ${myPrs.length}` },
      { id: 'issues', label: `내 이슈 ${direct.length}` },
    ]
    const empty = (text: string) =>
      state.kind === 'loading' && everything.length + myPrs.length + myIssues.length === 0 ? (
        <Text dimColor>GitHub에서 목록을 가져오고 있습니다. 처음에는 1분 정도 걸립니다.</Text>
      ) : (
        <Text dimColor>{text}</Text>
      )

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{TITLE}</Text>
          <Box flexDirection="row" gap={2}>
            <Text color={state.kind === 'error' ? 'error' : undefined} dimColor={state.kind !== 'error'}>
              {statusLine}
            </Text>
            <Button key="refresh" label="↻" dimColor onPress={() => {
                wanted = 'fetch'
              }} />
          </Box>
        </Box>
        <Box flexDirection="row" gap={1} marginY={1}>
          {tabs.map(t => (
            <Button
              key={`tab-${t.id}`}
              label={t.label}
              {...(t.id === active ? { variant: 'primary' as const } : { dimColor: true })}
              onPress={() => void update($, tab, () => t.id)}
            />
          ))}
        </Box>

        {active === 'review' && (
          <Box flexDirection="column">
            {hiddenCount > 0 && (
              <Box marginBottom={1}>
                <Button key="unhide" label={`숨김 ${hiddenCount} · 모두 보이기`} dimColor onPress={() => void setHidden($, () => ({}))} />
              </Box>
            )}
            {list.length === 0 && empty('지금 리뷰를 기다리는 PR이 없습니다.')}
            {ready.map(card)}
            {drafts.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Box marginBottom={1}>
                  <Text dimColor>초안 · 아직 리뷰 준비 전 {drafts.length}</Text>
                </Box>
                {drafts.map(card)}
              </Box>
            )}
          </Box>
        )}

        {active === 'mine' && (
          <Box flexDirection="column">
            {myPrs.length === 0 && empty('열려 있는 내 PR이 없습니다.')}
            {myPrs.map(prCard)}
          </Box>
        )}

        {active === 'issues' && (
          <Box flexDirection="column">
            {myIssues.length === 0 && empty('나에게 할당되거나 나를 언급한 이슈가 없습니다.')}
            {direct.map(issueCard)}
            {references.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Box marginBottom={1}>
                  <Text dimColor>최근 {REFERENCE_DAYS}일 · 다른 곳에서 내 작업을 언급 {references.length}</Text>
                </Box>
                {references.map(issueCard)}
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  })
}

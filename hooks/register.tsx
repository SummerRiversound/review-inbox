import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { InboxFile, InboxItem, InboxStatus, IssueItem, MyPr, Tab } from '../types'
import {
  CLAIM_MS,
  cacheKey,
  INBOX_QUERY,
  RETRY_MS,
  ageColor,
  failedSummary,
  isHidden,
  itemKey,
  lastReviewedSha,
  minutesSince,
  newArrivals,
  parseSummary,
  requestedAt,
  requestedTeam,
  reusableSummary,
  reviewPrompt,
  searchQuery,
  shouldFetch,
  shownReady,
  sincePrompt,
  sinceRules,
  sortItems,
  summaryPrompt,
  summaryRules,
  toDetail,
  waitingDays,
} from './inbox'
import type { GqlPr, PrDetail, SearchHit, Summary } from './inbox'
import { isLanguage, MESSAGES, pickLanguage } from './i18n'
import type { Language, Messages } from './i18n'
import {
  REFERENCES_QUERY,
  AUTHORED_DAYS,
  REFERENCE_DAYS,
  TABS_QUERY,
  bandCounts,
  bandLabels,
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

type Options = { scope?: string; githubUser?: string; language?: string }

let config = { scope: '', githubUser: '', language: 'en' as Language }
let languageOption: string | undefined
let m: Messages = MESSAGES.en
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

// One shared file per account, scope and language, so sessions configured differently never overwrite each other
// and a summary is never shown in another language than the cards around it.
const inboxFile = () => `inbox-${cacheKey(config.githubUser, config.scope, config.language)}.json`
// Keyed like the inbox: a hide prunes the entries its own list no longer has, so it must not share a file with another list.
const hiddenFile = () => `hidden-${cacheKey(config.githubUser, config.scope, config.language)}.json`

async function resolveLanguage($: EngineInterface): Promise<Language> {
  const read = async <T,>(get: () => Promise<T>) => {
    try {
      return await get()
    } catch {
      // A policy can refuse any call; the language then falls through to the next source.
      return undefined
    }
  }
  if (isLanguage(languageOption)) return languageOption
  // Only the one key: the settings also hold env values and credentials helpers.
  const claudeLanguage = await read(async () => (await $.settings.read()).language)
  const locale = await read(
    async () => (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG')),
  )
  return pickLanguage(languageOption, claudeLanguage, locale)
}

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
  const reply = await ask($, summaryRules(config.language), summaryPrompt(hit, detail), 800)
  const parsed = reply.text !== undefined ? parseSummary(reply.text) : undefined
  return parsed ?? failedSummary(hit.title, reply.reason ?? 'unreadable reply', prev, detail.headRefOid, m)
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
    const reply = await ask($, sinceRules(config.language), sincePrompt(diff.commits, diff.files), 300)
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
        const team = requestedTeam(detail.reviewRequests, me)
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
          ...(team ? { team } : {}),
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
    $.ui.toast(`${m.toast.newRequest} · ${item.repo} #${item.number} · ${item.summary}`)
  }
  if (fresh.length > 3) $.ui.toast(m.toast.moreRequests(fresh.length - 3))
  shownKeys = shownReady(file.items)

  if (prs) {
    const prNews = prAlerts(shownPrKeys, prs)
    for (const alert of prNews.slice(0, 3)) $.ui.toast(prAlertText(alert, m))
    if (prNews.length > 3) $.ui.toast(m.toast.morePrAlerts(prNews.length - 3))
    shownPrKeys = prSeenKeys(prs)
  }
  if (issueList) {
    const newIssues = issueAlerts(shownIssueKeys, issueList)
    for (const issue of newIssues.slice(0, 3)) {
      $.ui.toast(`${m.issueKind[issue.kind]} · ${issue.repo} #${issue.number} · ${issue.title}`)
    }
    if (newIssues.length > 3) $.ui.toast(m.toast.moreIssueAlerts(newIssues.length - 3))
    shownIssueKeys = issueList.map(issueKey)
  }
}

async function openDrawer($: EngineInterface) {
  await $.ui.open({
    id: PANE,
    title: m.title,
    focus: true,
    closeOnEscape: true,
    columns: Math.max(60, Math.floor(terminalColumns / 2)),
    // Inline (not fullscreen) the pane opens a third tall by default: one card. Ask for what the layout spares.
    rows: 200,
  })
}

async function startReview($: EngineInterface, item: InboxItem) {
  const { text } = await $.prompt.read()
  const filled = await $.prompt.fill({ text: reviewPrompt(text, item, m), mode: 'append' })
  if (!filled.isFilled) {
    $.ui.toast(m.toast.promptBusy)
    return
  }
  await $.ui.close({ id: PANE })
}

// Read-modify-write on its own file, so a hide never races a fetch rewriting the inbox.
async function setHidden($: EngineInterface, change: (h: Record<string, string>) => Record<string, string>) {
  const current = await readJson<Record<string, string>>($, hiddenFile(), {})
  if (current === undefined) {
    $.ui.toast(m.toast.retry)
    return
  }
  const live = new Set((await read($, items)).map(itemKey))
  const next = Object.fromEntries(Object.entries(change(current)).filter(([key]) => live.has(key)))
  await writeJson($, hiddenFile(), next)
  await update($, hidden, () => next)
}

export const register: Register = (on, options) => {
  const opts = options as Options
  languageOption = opts.language
  config = { scope: (opts.scope ?? '').trim(), githubUser: (opts.githubUser ?? '').trim(), language: 'en' }
  m = MESSAGES.en

  on('session.start', async ($, e, next) => {
    // Before anything is drawn or fetched: the language decides the strings and which shared file is read.
    config.language = await resolveLanguage($)
    m = MESSAGES[config.language]
    // A reload keeps an open pane, its title and the last drawing; bring them to the language just resolved.
    const pane = (await $.ui.panes()).find(p => p.id === PANE)
    if (pane && pane.title !== m.title) await $.ui.open({ id: PANE, title: m.title, closeOnEscape: true })
    $.ui.invalidate('ui.render')
    await $.command.register({ name: 'review-inbox', description: m.command.description })
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
    return { text: m.command.opened }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.viewport) terminalColumns = e.viewport.columns
    if (e.props.hasSurvey) return next(e)
    const hiddenMap = await read($, hidden)
    const reviews = (await read($, items)).filter(i => !i.isDraft && !isHidden(hiddenMap, i))
    const counts = bandLabels(bandCounts(reviews.length, await read($, mine), await read($, issues)), m)
    if (counts.length === 0) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const now = Date.now()
    const oldest = reviews.length > 0 ? Math.max(...reviews.map(i => waitingDays(i.requestedAt, now))) : undefined

    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row">
          <Text color={oldest === undefined ? 'subtle' : ageColor(oldest)}>▌ </Text>
          <Text bold>{counts.join(' · ')}</Text>
          {oldest !== undefined && <Text dimColor>{m.band.oldest(oldest)}</Text>}
        </Box>
        <Button key="open" label={m.band.open} variant="primary" onPress={() => void openDrawer($)} />
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
                {item.isRerequest && <Text color="suggestion"> {m.card.rerequest}</Text>}
              </Text>
              <Text dimColor>
                <Text color={item.isDraft ? 'inactive' : days >= 3 ? ageColor(days) : undefined}>
                  {m.card.waiting(days)}
                </Text>
                {' · '}
                {item.team === undefined ? m.card.direct : m.card.team(item.team)}
              </Text>
            </Box>
            <Text dimColor wrap="truncate-end">
              <Link href={item.url}>{item.title} ↗</Link>
            </Text>

            {item.sinceLastReview && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="suggestion">{m.card.sinceMyReview}</Text>
                <Text>{item.sinceLastReview}</Text>
              </Box>
            )}
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>{m.card.summary}</Text>
              <Text bold>{item.summary}</Text>
            </Box>
            {item.why && (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>{m.card.why}</Text>
                <Text>{item.why}</Text>
              </Box>
            )}
            {item.impact.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>{m.card.impact}</Text>
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
                {item.author} · {m.card.size(item.files, item.additions.toLocaleString(), item.deletions.toLocaleString())}
              </Text>
              <Box flexDirection="row" gap={1}>
                <Button
                  key={`hide-${item.repo}-${item.number}`}
                  label={m.card.hide}
                  dimColor
                  onPress={() => void setHidden($, h => ({ ...h, [itemKey(item)]: item.headSha }))}
                />
                <Button
                  key={`review-${item.repo}-${item.number}`}
                  label={m.card.review}
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
                {m.state[pr.state]}
              </Text>
              <Text dimColor>
                {pr.ciPending ? m.card.ciRunning : ''} · {m.card.waiting(waitingDays(pr.createdAt, now))}
              </Text>
            </Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            <Link href={pr.url}>{pr.title} ↗</Link>
          </Text>
          {pr.newReviews.length > 0 && (
            <Text color="suggestion" wrap="truncate-end">
              {m.card.newReview(reviewers(pr))}
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
              {m.issueKind[issue.kind]} · {m.card.ago(waitingDays(issue.at, now))}
            </Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            <Link href={issue.url}>{issue.title} ↗</Link>
          </Text>
          {issue.kind === 'reference' && (
            <Text dimColor>
              {m.card.referenced(issue.by ?? '', issue.target ?? '')}
            </Text>
          )}
        </Box>
      </Box>
    )

    const minutes = minutesSince(state.updatedAt, now)
    const statusLine =
      state.kind === 'loading'
        ? m.status.loading
        : state.kind === 'error'
          ? m.status.error(state.message ?? '')
          : minutes === undefined
            ? ''
            : m.status.updated(minutes)

    const references = myIssues.filter(i => i.kind === 'reference')
    const direct = myIssues.filter(i => i.kind !== 'reference')
    const tabs: { id: Tab; label: string }[] = [
      { id: 'review', label: m.tabs.review(ready.length) },
      { id: 'mine', label: m.tabs.mine(myPrs.length) },
      { id: 'issues', label: m.tabs.issues(direct.length) },
    ]
    const empty = (text: string) =>
      state.kind === 'loading' && everything.length + myPrs.length + myIssues.length === 0 ? (
        <Text dimColor>{m.status.firstFetch}</Text>
      ) : (
        <Text dimColor>{text}</Text>
      )

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{m.title}</Text>
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
                <Button key="unhide" label={m.sections.hidden(hiddenCount)} dimColor onPress={() => void setHidden($, () => ({}))} />
              </Box>
            )}
            {list.length === 0 && empty(m.empty.review)}
            {ready.map(card)}
            {drafts.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Box marginBottom={1}>
                  <Text dimColor>{m.sections.drafts(drafts.length)}</Text>
                </Box>
                {drafts.map(card)}
              </Box>
            )}
          </Box>
        )}

        {active === 'mine' && (
          <Box flexDirection="column">
            {myPrs.length === 0 && empty(m.empty.mine)}
            {myPrs.map(prCard)}
          </Box>
        )}

        {active === 'issues' && (
          <Box flexDirection="column">
            {myIssues.length === 0 && empty(m.empty.issues)}
            {direct.map(issueCard)}
            {references.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Box marginBottom={1}>
                  <Text dimColor>{m.sections.references(REFERENCE_DAYS, references.length)}</Text>
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

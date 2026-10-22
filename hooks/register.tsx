import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import type { Capped, InboxFile, InboxItem, InboxStatus, IssueItem, MyPr, Note, Presence, Tab } from '../types'
import {
  CLAIM_MS,
  cacheKey,
  INBOX_QUERY,
  RETRY_MS,
  ageColor,
  failedSummary,
  hasRequest,
  isHidden,
  isTorn,
  itemKey,
  lastReviewedSha,
  minutesSince,
  newArrivals,
  parseSummary,
  requestedAt,
  requestedTeam,
  reusableSummary,
  reviewPrompts,
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
import { BODY_CHARS, isSnoozed, keptNotes, matches, snoozeUntil } from './notes'
import { liveSessions, repoOf, workingOn } from './sessions'
import type { Language, Messages } from './i18n'
import { STYLE_JQ, STYLE_QUERY, STYLE_RETRY_MS, parseStyle, shouldBuildStyle, stylePrompt, styleQuery, styleRules, styleSamples } from './style'
import type { GqlReviewed, StyleFile } from './style'
import {
  REFERENCES_QUERY,
  AUTHORED_DAYS,
  ORDER,
  REFERENCE_DAYS,
  TABS_QUERY,
  atLeast,
  bandCounts,
  bandLabels,
  isIssueHidden,
  isPrHidden,
  issueAlerts,
  issueHide,
  issueHideKey,
  issueKey,
  prAlertText,
  prAlerts,
  prHide,
  prHideKey,
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
// A toast stays about four seconds and an inline session shows only the latest, so several are shown one after another.
const TOAST_GAP_MS = 4_500

const items = atom({ plugin: 'review-inbox', key: 'items' } as const, [] as InboxItem[])
const status = atom({ plugin: 'review-inbox', key: 'status' } as const, {
  kind: 'idle',
} as InboxStatus)
const hidden = atom({ plugin: 'review-inbox', key: 'hidden' } as const, {} as Record<string, string>)
const mine = atom({ plugin: 'review-inbox', key: 'mine' } as const, [] as MyPr[])
const issues = atom({ plugin: 'review-inbox', key: 'issues' } as const, [] as IssueItem[])
const capped = atom({ plugin: 'review-inbox', key: 'capped' } as const, {} as Capped)
const tab = atom({ plugin: 'review-inbox', key: 'tab' } as const, 'review' as Tab)
const collapsed = atom({ plugin: 'review-inbox', key: 'collapsed' } as const, [] as string[])
const notes = atom({ plugin: 'review-inbox', key: 'notes' } as const, {} as Record<string, Note>)
const query = atom({ plugin: 'review-inbox', key: 'query' } as const, '')
const editing = atom({ plugin: 'review-inbox', key: 'editing' } as const, '')
const sessions = atom({ plugin: 'review-inbox', key: 'sessions' } as const, {} as Record<string, Presence>)
// The cards whose review request is in the prompt, so pressing Review again adds nothing.
// PRs Review was pressed on since the drawer opened, filled when it closes; requested ones the draft already asked for when it opened.
const added = atom({ plugin: 'review-inbox', key: 'added' } as const, [] as string[])
const requested = atom({ plugin: 'review-inbox', key: 'requested' } as const, [] as string[])

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
let shownSnoozed: string[] | undefined
// What the open note field holds; a button beside it saves this.
let draft = ''
// A button's or a command's dispatch ends before a fetch would, so they only ask; the session's timer does it.
let wanted: 'sync' | 'fetch' | undefined
let toastFreeAt = 0
const sessionToken = Math.random().toString(36).slice(2)
// The session's own id, which a reload keeps, and the PRs its prompts linked to.
let selfId = ''
let linked: string[] = []

// Claude Code's per-plugin data folder; a mod is not told its id, so it falls back to a fixed name there.
async function cacheDir($: EngineInterface) {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  const configDir = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? (home ? `${home}/.claude` : undefined)
  // Without it a relative path would land inside whatever repo the session is in.
  if (!configDir) throw new Error('neither HOME nor USERPROFILE is set')
  return `${configDir}/plugins/data/review-inbox`
}

// undefined when the file exists but does not parse: another session may be mid-write, so skip this look.
// One that stays unparsable was cut short, by a crash or an older version of the mod; it reads as missing so the next write replaces it.
async function readJson<T>($: EngineInterface, name: string, missing: T): Promise<T | undefined> {
  const path = `${await cacheDir($)}/${name}`
  if (!(await $.fs.exists(path))) return missing
  try {
    return JSON.parse(await $.fs.read(path)) as T
  } catch {
    const stat = await $.fs.stat(path).catch(() => undefined)
    return stat !== undefined && isTorn(stat.mtimeMs, Date.now()) ? missing : undefined
  }
}

// Whether mv runs here; Windows has none, so the file is written in place there.
let canMove: Promise<boolean> | undefined

async function writeJson($: EngineInterface, name: string, value: unknown) {
  const path = `${await cacheDir($)}/${name}`
  const text = JSON.stringify(value)
  canMove ??= $.process.run(['mv']).then(() => true, () => false)
  if (await canMove) {
    // Written aside and moved over, so a reader never sees half a file.
    const temp = `${path}.${sessionToken}.tmp`
    await $.fs.write(temp, text)
    if ((await $.process.run(['mv', '-f', temp, path])).exitCode === 0) return
  }
  await $.fs.write(path, text)
}

// One shared file per account, scope and language, so sessions configured differently never overwrite each other
// and a summary is never shown in another language than the cards around it.
const inboxFile = () => `inbox-${cacheKey(config.githubUser, config.scope, config.language)}.json`
// Keyed like the inbox: a hide prunes the entries its own list no longer has, so it must not share a file with another list.
const hiddenFile = () => `hidden-${cacheKey(config.githubUser, config.scope, config.language)}.json`
// Not keyed by language: a note I wrote stays when the language changes.
const notesFile = () => `notes-${cacheKey(config.githubUser, config.scope)}.json`
const styleFile = () => `style-${cacheKey(config.githubUser, config.scope, config.language)}.json`
// One for every account: a session's branch and links say nothing about who is signed in.
const SESSIONS_FILE = 'sessions.json'

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
): Promise<{ mine: MyPr[]; issues: IssueItem[]; capped: Capped }> {
  const q = tabQueries(config.scope)
  const data = JSON.parse(
    await gh(
      $,
      ['api', 'graphql', '-f', `query=${TABS_QUERY}`, '-f', `mine=${q.mine}`, '-f', `assigned=${q.assigned}`,
        '-f', `mentioned=${q.mentioned}`, '--jq', `.data | (.mine.nodes[], .assigned.nodes[], .mentioned.nodes[]) |= (if .body then .body |= .[:${BODY_CHARS}] else . end)`],
      env,
    ),
  ) as {
    viewer: { login: string }
    mine: { pageInfo: { hasNextPage: boolean }; nodes: Partial<GqlMyPr>[] }
    assigned: { pageInfo: { hasNextPage: boolean }; nodes: Partial<GqlTouched>[] }
    mentioned: { pageInfo: { hasNextPage: boolean }; nodes: Partial<GqlTouched>[] }
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
    capped: { mine: data.mine.pageInfo.hasNextPage, issues: data.assigned.pageInfo.hasNextPage || data.mentioned.pageInfo.hasNextPage },
  }
}

async function fetchInbox(
  $: EngineInterface,
  env: Record<string, string>,
  previous: InboxItem[],
  heartbeat: () => Promise<void>,
): Promise<{ items: InboxItem[]; capped: boolean }> {
  const data = JSON.parse(
    await gh(
      $,
      ['api', 'graphql', '-f', `query=${INBOX_QUERY}`,
        '-f', `q=${searchQuery(config.scope)}`, '--jq', '.data | .search.nodes |= map(if .body then .body |= .[:12000] else . end)'],
      env,
    ),
  ) as { viewer: { login: string }; search: { pageInfo: { hasNextPage: boolean }; nodes: Partial<GqlPr>[] } }
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
          ...(pr.body ? { body: pr.body.slice(0, BODY_CHARS) } : {}),
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
  return { items: sortItems(next), capped: data.search.pageInfo.hasNextPage }
}

function toast($: EngineInterface, text: string) {
  const now = Date.now()
  const at = Math.max(now, toastFreeAt)
  toastFreeAt = at + TOAST_GAP_MS
  if (at === now) $.ui.toast(text)
  else $.clock.after(at - now, () => $.ui.toast(text))
}

// Run by the session that just fetched; a failure keeps the last style and tries again a day later.
async function refreshStyle($: EngineInterface, env: Record<string, string>) {
  const file = await readJson<StyleFile>($, styleFile(), {})
  if (file === undefined || !shouldBuildStyle(file, Date.now())) return
  try {
    const data = JSON.parse(
      await gh($, ['api', 'graphql', '-f', `query=${STYLE_QUERY}`, '-f', `q=${styleQuery(config.scope)}`, '--jq', STYLE_JQ], env),
    ) as { viewer: { login: string }; search: { nodes: Partial<GqlReviewed>[] } }
    const samples = styleSamples(data.search.nodes, data.viewer.login)
    const prompt = stylePrompt(samples)
    if (prompt === undefined) {
      await writeJson($, styleFile(), { checkedAt: Date.now(), samples: samples.length } satisfies StyleFile)
      return
    }
    const reply = await ask($, styleRules(config.language), prompt, 400)
    const profile = reply.text === undefined ? undefined : parseStyle(reply.text)
    if (profile === undefined) throw new Error(reply.reason ?? 'empty reply')
    await writeJson($, styleFile(), { profile, checkedAt: Date.now(), samples: samples.length } satisfies StyleFile)
  } catch {
    await writeJson($, styleFile(), { ...file, retryAt: Date.now() + STYLE_RETRY_MS } satisfies StyleFile).catch(() => undefined)
  }
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
    let env: Record<string, string> | undefined
    try {
      env = await ghEnv($)
      const tabs = await fetchTabs($, env, file.issues ?? [])
      const fetched = await fetchInbox($, env, file.items, () =>
        writeJson($, inboxFile(), { ...claim, fetchingSince: Date.now() }),
      )
      result = { items: fetched.items, ...tabs, capped: { ...tabs.capped, review: fetched.capped }, fetchedAt: Date.now() }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Keep the last good list and try again in a minute, not after a full refresh interval.
      result = { items: file.items, mine: file.mine, issues: file.issues, capped: file.capped, fetchedAt: file.fetchedAt ?? Date.now(), retryAt: Date.now() + RETRY_MS, error: message }
    }
    await writeJson($, inboxFile(), result)
    await show($, result)
    if (env !== undefined && result.error === undefined) await refreshStyle($, env)
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
  await update($, capped, () => file.capped ?? {})
  await update($, status, () =>
    claimed
      ? { kind: 'loading' as const, updatedAt: file.fetchedAt }
      : file.error
        ? { kind: 'error' as const, message: file.error, updatedAt: file.fetchedAt }
        : { kind: 'ready' as const, updatedAt: file.fetchedAt },
  )
  const hiddenNow = await readJson<Record<string, string>>($, hiddenFile(), {})
  if (hiddenNow !== undefined) await update($, hidden, () => hiddenNow)
  const notesNow = await readJson<Record<string, Note>>($, notesFile(), {})
  if (notesNow !== undefined) await update($, notes, () => notesNow)

  // An empty file from before the first fetch, or an error result, must not become the baseline, or everything reads as new.
  if (claimed || file.fetchedAt === undefined || file.error !== undefined) return
  const fresh = newArrivals(shownKeys, file.items)
  for (const item of fresh.slice(0, 3)) {
    toast($, `${m.toast.newRequest} · ${item.repo} #${item.number} · ${item.summary}`)
  }
  if (fresh.length > 3) toast($, m.toast.moreRequests(fresh.length - 3))
  shownKeys = shownReady(file.items)

  if (prs) {
    const prNews = prAlerts(shownPrKeys, prs)
    for (const alert of prNews.slice(0, 3)) toast($, prAlertText(alert, m))
    if (prNews.length > 3) toast($, m.toast.morePrAlerts(prNews.length - 3))
    shownPrKeys = prSeenKeys(prs)
  }
  if (issueList) {
    const newIssues = issueAlerts(shownIssueKeys, issueList)
    for (const issue of newIssues.slice(0, 3)) {
      toast($, `${m.issueKind[issue.kind]} · ${issue.repo} #${issue.number} · ${issue.title}`)
    }
    if (newIssues.length > 3) toast($, m.toast.moreIssueAlerts(newIssues.length - 3))
    shownIssueKeys = issueList.map(issueKey)
  }
  if (notesNow !== undefined) {
    // Snoozed alone: a card that was away at the last look and no longer is came back by its day or its news.
    const snoozed = awayTests({}, notesNow, Date.now())
    const cards = [
      ...file.items.map(i => ({ key: itemKey(i), name: `${i.repo} #${i.number}`, isAway: snoozed.review(i) })),
      ...(prs ?? []).map(pr => ({ key: prHideKey(pr), name: `${pr.repo} #${pr.number}`, isAway: snoozed.pr(pr) })),
      ...(issueList ?? []).map(i => ({ key: issueHideKey(i), name: `${i.repo} #${i.number}`, isAway: snoozed.issue(i) })),
    ]
    const before = shownSnoozed
    shownSnoozed = cards.filter(c => c.isAway).map(c => c.key)
    // A note cleared or unsnoozed by hand has no snooze left, so it is not announced.
    for (const c of cards.filter(c => before?.includes(c.key) && !c.isAway && notesNow[c.key]?.until !== undefined)) {
      toast($, [m.toast.back, c.name, notesNow[c.key]?.text].filter(Boolean).join(' · '))
    }
  }
}

async function openDrawer($: EngineInterface) {
  // Opening an open drawer only brings it forward; its picks wait for the close that fills them.
  if (!(await $.ui.panes()).some(p => p.id === PANE)) {
    // What the draft already asks for shows as added; a sent or cleared draft frees the cards again.
    const { text } = await $.prompt.read()
    const list = await read($, items)
    await update($, requested, () => list.filter(i => hasRequest(text, i.url)).map(itemKey))
    await update($, added, () => [])
  }
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

// Filling the prompt takes the keyboard from the drawer, so Review only marks a card and the drawer's close fills them all.
async function addCard($: EngineInterface, item: InboxItem) {
  const key = itemKey(item)
  const keys = await read($, added)
  if (keys.includes(key) || (await read($, requested)).includes(key)) return
  await update($, added, () => [...keys, key])
  $.ui.toast(m.toast.added(keys.length + 1))
}

// False only when a dialog holds the keys: that passes, so the drawer stays open with its picks and the next close tries again.
async function fillAdded($: EngineInterface): Promise<boolean> {
  const byKey = new Map((await read($, items)).map(i => [itemKey(i), i]))
  const chosen = (await read($, added)).flatMap(key => byKey.get(key) ?? [])
  if (chosen.length > 0) {
    const { text } = await $.prompt.read()
    const style = (await readJson<StyleFile>($, styleFile(), {}))?.profile
    const more = reviewPrompts(text, chosen, m, style)
    const filled = more ? await $.prompt.fill({ text: more, mode: 'append' }) : undefined
    if (filled?.isFilled === false) {
      $.ui.toast(m.toast.promptBusy)
      if (filled.refusal === 'dialog') return false
    }
  }
  await update($, added, () => [])
  return true
}

// Whether each kind of card is out of view: hidden until its news, or snoozed until its day or its news.
function awayTests(hiddenMap: Record<string, string>, notesMap: Record<string, Note>, now: number) {
  const away = (key: string, test: (h: Record<string, string>) => boolean) => test(hiddenMap) || isSnoozed(notesMap[key], key, now, test)
  return {
    review: (i: InboxItem) => away(itemKey(i), h => isHidden(h, i)),
    pr: (pr: MyPr) => away(prHideKey(pr), h => isPrHidden(h, pr)),
    issue: (i: IssueItem) => away(issueHideKey(i), h => isIssueHidden(h, i)),
  }
}

async function liveKeys($: EngineInterface) {
  return new Set([
    ...(await read($, items)).map(itemKey),
    ...(await read($, mine)).map(prHideKey),
    ...(await read($, issues)).map(issueHideKey),
  ])
}

// Read-modify-write on its own file, like a hide.
async function setNotes($: EngineInterface, change: (n: Record<string, Note>) => Record<string, Note>) {
  const current = await readJson<Record<string, Note>>($, notesFile(), {})
  if (current === undefined) {
    $.ui.toast(m.toast.retry)
    return
  }
  const next = keptNotes(change(current), await liveKeys($), Date.now())
  await writeJson($, notesFile(), next)
  await update($, notes, () => next)
}

// Saving the text keeps a snooze already set; an empty note with no snooze is no note.
async function saveNote($: EngineInterface, key: string, text: string, snooze?: { until: number; mark: string }) {
  await setNotes($, n => {
    const { [key]: old, ...rest } = n
    const note = { ...old, ...snooze, text: text.trim(), savedAt: Date.now() }
    return note.text || note.until !== undefined ? { ...rest, [key]: note } : rest
  })
  await update($, editing, () => '')
}

// Show all ends the snoozes of the same cards; their text stays.
async function unsnooze($: EngineInterface, keys: string[]) {
  await setNotes($, n =>
    Object.fromEntries(
      Object.entries(n)
        .map(([k, note]): [string, Note] => [k, keys.includes(k) ? { text: note.text, savedAt: note.savedAt } : note])
        .filter(([, note]) => note.text || note.until !== undefined),
    ),
  )
}

// Tells the other sessions what this one is on, and reads what they are on.
// shortcut: two sessions writing in the same instant can drop one entry until its next check-in, 30 seconds on; lock the file if that shows
async function checkIn($: EngineInterface, leaving = false) {
  const file = await readJson<Record<string, Presence>>($, SESSIONS_FILE, {})
  if (file === undefined) return
  const { [selfId]: old, ...others } = liveSessions(file, Date.now())
  let next = others
  if (!leaving) {
    const cwd = await $.session.cwd()
    const git = (args: string[]) =>
      $.process.run(['git', '-C', cwd, ...args]).then(r => (r.exitCode === 0 ? r.stdout : ''), () => '')
    const branch = (await git(['branch', '--show-current'])).trim()
    const remotes = [...new Set((await git(['remote', '-v'])).split('\n').flatMap(line => repoOf(line.split(/\s+/)[1] ?? '') ?? []))]
    const prs = [...new Set([...(old?.prs ?? []), ...linked])].slice(-20)
    const folder = cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
    next = { ...others, [selfId]: { at: Date.now(), folder, remotes, prs, ...(branch ? { branch } : {}) } }
  }
  await writeJson($, SESSIONS_FILE, next)
  await update($, sessions, () => next)
}

// Read-modify-write on its own file, so a hide never races a fetch rewriting the inbox.
async function setHidden($: EngineInterface, change: (h: Record<string, string>) => Record<string, string>) {
  const current = await readJson<Record<string, string>>($, hiddenFile(), {})
  if (current === undefined) {
    $.ui.toast(m.toast.retry)
    return
  }
  const live = await liveKeys($)
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
    selfId = await $.session.id()
    $.clock.after(1_000, () => void checkIn($).catch(() => undefined))
    $.clock.every(SYNC_MS, () => void checkIn($).catch(() => undefined))
    $.clock.every(1_000, () => {
      if (!wanted) return
      const force = wanted === 'fetch'
      wanted = undefined
      void sync($, force)
    })
    return next(e)
  })

  // A prompt that links to a PR on the lists puts it in progress in this session.
  on('prompt.submit', async ($, e, next) => {
    const urls = [...(await read($, items)), ...(await read($, mine))].map(pr => pr.url).filter(url => hasRequest(e.text, url))
    if (urls.length > 0) {
      linked = [...linked, ...urls]
      await checkIn($).catch(() => undefined)
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await checkIn($, true).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: 'review-inbox' }, async ($, e) => {
    terminalColumns = e.presentation.columns
    await openDrawer($)
    wanted ??= 'sync'
    return { text: m.command.opened }
  })

  // Fill before the drawer goes, so a fill a dialog refuses keeps it open; answering without next keeps a pane.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'unload') return next(e)
    const isFilled = await fillAdded($).catch(() => {
      $.ui.toast(m.toast.retry)
      return true
    })
    return isFilled ? next(e) : { value: undefined }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.viewport) terminalColumns = e.viewport.columns
    if (e.props.hasSurvey) return next(e)
    const away = awayTests(await read($, hidden), await read($, notes), Date.now())
    const reviews = (await read($, items)).filter(i => !i.isDraft && !away.review(i))
    const prs = (await read($, mine)).filter(pr => !away.pr(pr))
    const issueList = (await read($, issues)).filter(i => !away.issue(i))
    const counts = bandLabels(bandCounts(reviews.length, prs, issueList), m, await read($, capped))
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
    const elements = $.ui.resolve(e)
    const { Box, Text, Button, Link } = elements
    // The mobile app draws no field yet: no search there, and notes are shown but not written.
    const Input = 'Input' in elements ? elements.Input : undefined
    const now = Date.now()
    const notesMap = await read($, notes)
    const away = awayTests(await read($, hidden), notesMap, now)
    const rawQuery = await read($, query)
    const q = rawQuery.trim()
    const editingKey = await read($, editing)
    const everything = await read($, items)
    const list = everything.filter(i => !away.review(i))
    const state = await read($, status)
    const ready = list.filter(i => !i.isDraft)
    const drafts = list.filter(i => i.isDraft)
    const active = await read($, tab)
    const allPrs = await read($, mine)
    const myPrs = allPrs.filter(pr => !away.pr(pr))
    const allIssues = await read($, issues)
    const myIssues = allIssues.filter(i => !away.issue(i))
    const cappedTabs = await read($, capped)
    const shut = await read($, collapsed)
    const addedKeys = [...(await read($, added)), ...(await read($, requested))]
    const live = liveSessions(await read($, sessions), now)
    const where = (pr: { repo: string; url: string; branch?: string }) =>
      workingOn(live, pr).map(id => (id === selfId ? m.session.here : live[id]!.folder))
    const sessionLine = (pr: { repo: string; url: string; branch?: string }) => {
      const names = where(pr)
      return names.length > 0 && <Text color="suggestion">{m.session.at(names.join(', '))}</Text>
    }

    // My note above the title, with its snooze day.
    const noteLine = (key: string) => {
      const note = notesMap[key]
      const until = note?.until === undefined ? undefined : new Date(note.until)
      const parts = [note?.text && m.note.shown(note.text), until && m.note.until(until.getMonth() + 1, until.getDate())].filter(Boolean)
      if (parts.length === 0) return undefined
      return (
        <Box flexDirection="row" justifyContent="space-between" gap={1}>
          <Box flexShrink={1}>
            <Text color="suggestion" wrap="truncate-end">
              {parts.join(' · ')}
            </Text>
          </Box>
          <Button
            key={`note-clear-${key}`}
            label={m.note.clear}
            dimColor
            onPress={() => void setNotes($, n => Object.fromEntries(Object.entries(n).filter(([k]) => k !== key)))}
          />
        </Box>
      )
    }
    const noteButton = (key: string) =>
      Input && (
        <Button
          key={`note-${key}`}
          label={m.note.edit}
          dimColor
          onPress={() => {
            draft = notesMap[key]?.text ?? ''
            void update($, editing, () => key)
          }}
        />
      )
    // `mark` is read at the press: the hide mark a snooze ends on.
    const noteEditor = (key: string, mark: () => string) =>
      Input &&
      editingKey === key && (
        <Box flexDirection="column" marginTop={1}>
          <Input
            key={`note-input-${key}`}
            label={m.note.label}
            placeholder={m.note.placeholder}
            value={notesMap[key]?.text ?? ''}
            submitLabel={m.note.save}
            autoFocus
            onInput={value => {
              draft = value
            }}
            onSubmit={value => void saveNote($, key, value)}
          />
          <Box flexDirection="row" gap={1}>
            <Button key={`note-save-${key}`} label={m.note.save} variant="primary" onPress={() => void saveNote($, key, draft)} />
            <Button
              key={`note-tomorrow-${key}`}
              label={m.note.tomorrow}
              onPress={() => void saveNote($, key, draft, { until: snoozeUntil('tomorrow', new Date()), mark: mark() })}
            />
            <Button
              key={`note-week-${key}`}
              label={m.note.nextWeek}
              onPress={() => void saveNote($, key, draft, { until: snoozeUntil('nextWeek', new Date()), mark: mark() })}
            />
            <Button key={`note-cancel-${key}`} label={m.note.cancel} dimColor onPress={() => void update($, editing, () => '')} />
          </Box>
        </Box>
      )

    const card = (item: InboxItem) => {
      const days = waitingDays(item.requestedAt, now)
      const isAdded = addedKeys.includes(itemKey(item))
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
            {sessionLine(item)}
            {noteLine(itemKey(item))}
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
                {noteButton(itemKey(item))}
                <Button
                  key={`hide-${item.repo}-${item.number}`}
                  label={m.card.hide}
                  dimColor
                  onPress={() => void setHidden($, h => ({ ...h, [itemKey(item)]: item.headSha }))}
                />
                <Button
                  key={`review-${itemKey(item)}`}
                  label={isAdded ? m.card.added : m.card.review}
                  {...(isAdded ? { dimColor: true } : { variant: 'primary' as const })}
                  onPress={() => void addCard($, item)}
                />
              </Box>
            </Box>
            {noteEditor(itemKey(item), () => item.headSha)}
          </Box>
        </Box>
      )
    }

    const titleRow = (url: string, title: string, actions: RenderChildren) => (
      <Box flexDirection="row" justifyContent="space-between" gap={1}>
        <Box flexShrink={1}>
          <Text dimColor wrap="truncate-end">
            <Link href={url}>{title} ↗</Link>
          </Text>
        </Box>
        <Box flexDirection="row" gap={1} flexShrink={0}>
          {actions}
        </Box>
      </Box>
    )

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
          {sessionLine(pr)}
          {noteLine(prHideKey(pr))}
          {titleRow(pr.url, pr.title, [
            noteButton(prHideKey(pr)),
            <Button
              key={`hide-${pr.url}`}
              label={m.card.hide}
              dimColor
              onPress={() => void setHidden($, h => ({ ...h, ...Object.fromEntries([prHide(pr, Date.now())]) }))}
            />,
          ])}
          {pr.newReviews.length > 0 && (
            <Text color="suggestion" wrap="truncate-end">
              {m.card.newReview(reviewers(pr))}
            </Text>
          )}
          {noteEditor(prHideKey(pr), () => prHide(pr, Date.now())[1])}
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
          {noteLine(issueHideKey(issue))}
          {titleRow(issue.url, issue.title, [
            noteButton(issueHideKey(issue)),
            <Button
              key={`hide-${issueKey(issue)}`}
              label={m.card.hide}
              dimColor
              onPress={() => void setHidden($, h => ({ ...h, ...Object.fromEntries([issueHide(issue)]) }))}
            />,
          ])}
          {issue.kind === 'reference' && (
            <Text dimColor>
              {m.card.referenced(issue.by ?? '', issue.target ?? '')}
            </Text>
          )}
          {noteEditor(issueHideKey(issue), () => issueHide(issue)[1])}
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

    const direct = myIssues.filter(i => i.kind !== 'reference')
    const tabs: { id: Tab; label: string }[] = [
      { id: 'review', label: m.tabs.review(atLeast(ready.length, cappedTabs.review)) },
      { id: 'mine', label: m.tabs.mine(atLeast(myPrs.length, cappedTabs.mine)) },
      { id: 'issues', label: m.tabs.issues(atLeast(direct.length, cappedTabs.issues)) },
    ]
    const empty = (text: string) =>
      state.kind === 'loading' && everything.length + allPrs.length + allIssues.length === 0 ? (
        <Text dimColor>{m.status.firstFetch}</Text>
      ) : (
        <Text dimColor>{text}</Text>
      )

    // A category with a header that folds it; an empty one is left out.
    const section = <T,>(id: string, label: string, list: T[], render: (item: T) => RenderChildren) => {
      if (list.length === 0) return undefined
      const isShut = shut.includes(id)
      return (
        <Box key={`section-${id}`} flexDirection="column">
          <Box marginBottom={1}>
            <Button
              key={`fold-${id}`}
              label={`${isShut ? '▸' : '▾'} ${label}`}
              dimColor
              onPress={() => void update($, collapsed, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))}
            />
          </Box>
          {!isShut && list.map(render)}
        </Box>
      )
    }
    // Show all brings back only this tab's hidden cards.
    const unhide = (keys: string[]) =>
      keys.length > 0 && (
        <Box marginBottom={1}>
          <Button
            key="unhide"
            label={m.sections.hidden(keys.length)}
            dimColor
            onPress={async () => {
              await setHidden($, h => Object.fromEntries(Object.entries(h).filter(([k]) => !keys.includes(k))))
              await unsnooze($, keys)
            }}
          />
        </Box>
      )
    // Across every tab, hidden and snoozed cards included, so a card put away can be found again.
    const found = q
      ? {
          review: everything.filter(i => matches(q, [`${i.repo} #${i.number}`, i.title, i.author, i.summary, i.why, i.body, notesMap[itemKey(i)]?.text])),
          mine: allPrs.filter(pr => matches(q, [`${pr.repo} #${pr.number}`, pr.title, pr.body, notesMap[prHideKey(pr)]?.text])),
          issues: allIssues.filter(i =>
            matches(q, [`${i.repo} #${i.number}`, i.title, i.body, i.by, i.target, notesMap[issueHideKey(i)]?.text]),
          ),
        }
      : undefined
    const resultRow = (key: string, item: { repo: string; number: number; title: string; url: string }, isAway: boolean) => (
      <Box key={`found-${key}`} flexDirection="row" justifyContent="space-between" gap={1} marginBottom={1}>
        <Box flexShrink={1}>
          <Text wrap="truncate-end">
            <Text bold>
              {item.repo} #{item.number}
            </Text>{' '}
            <Link href={item.url}>{item.title} ↗</Link>
          </Text>
        </Box>
        {isAway && <Text dimColor>{m.search.hidden}</Text>}
      </Box>
    )
    // Cards some session is working on gather at the top of their tab; the counts stay as they are.
    const reviewing = list.filter(i => where(i).length > 0)
    const idle = ready.filter(i => !reviewing.includes(i))
    const directReady = idle.filter(i => i.team === undefined)
    const teamReady = idle.filter(i => i.team !== undefined)
    const idleDrafts = drafts.filter(i => !reviewing.includes(i))
    const working = myPrs.filter(pr => where(pr).length > 0)

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
        {Input && (
          <Box marginTop={1}>
            <Input
              key="search"
              label={m.search.label}
              placeholder={m.search.placeholder}
              value={rawQuery}
              submitLabel={m.search.label}
              onInput={value => void update($, query, () => value)}
              onSubmit={value => void update($, query, () => value)}
            />
          </Box>
        )}

        {found && (
          <Box flexDirection="column" marginTop={1}>
            {found.review.length + found.mine.length + found.issues.length === 0 && <Text dimColor>{m.search.empty}</Text>}
            {section('search:review', m.tabs.review(`${found.review.length}`), found.review, i => resultRow(itemKey(i), i, away.review(i)))}
            {section('search:mine', m.tabs.mine(`${found.mine.length}`), found.mine, pr => resultRow(prHideKey(pr), pr, away.pr(pr)))}
            {section('search:issues', m.tabs.issues(`${found.issues.length}`), found.issues, i =>
              resultRow(issueHideKey(i), i, away.issue(i)),
            )}
          </Box>
        )}

        {!found && (
          <Box flexDirection="column">
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
                {unhide(everything.filter(away.review).map(itemKey))}
                {list.length === 0 && empty(m.empty.review)}
                {section('review:session', m.sections.session(reviewing.length), reviewing, card)}
                {section('review:direct', m.sections.direct(directReady.length), directReady, card)}
                {section('review:team', m.sections.team(teamReady.length), teamReady, card)}
                {section('review:drafts', m.sections.drafts(idleDrafts.length), idleDrafts, card)}
              </Box>
            )}

            {active === 'mine' && (
              <Box flexDirection="column">
                {unhide(allPrs.filter(away.pr).map(prHideKey))}
                {myPrs.length === 0 && empty(m.empty.mine)}
                {section('mine:session', m.sections.session(working.length), working, prCard)}
                {ORDER.map(s => {
                  const group = myPrs.filter(pr => pr.state === s && !working.includes(pr))
                  return section(`mine:${s}`, `${m.state[s]} ${group.length}`, group, prCard)
                })}
              </Box>
            )}

            {active === 'issues' && (
              <Box flexDirection="column">
                {unhide(allIssues.filter(away.issue).map(issueHideKey))}
                {myIssues.length === 0 && empty(m.empty.issues)}
                {(['assigned', 'mention', 'reference'] as const).map(kind => {
                  const group = myIssues.filter(i => i.kind === kind)
                  const label = kind === 'reference' ? m.sections.references(REFERENCE_DAYS, group.length) : `${m.issueKind[kind]} ${group.length}`
                  return section(`issues:${kind}`, label, group, issueCard)
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  })
}

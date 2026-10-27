import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import type {
  Actions,
  Activity,
  AutoJob,
  AutoReviewFile,
  ButtonScope,
  Capped,
  Confirming,
  DirectAction,
  DirectResult,
  DirectTarget,
  GroupHit,
  GroupResult,
  InboxFile,
  InboxItem,
  InboxStatus,
  IssueItem,
  MyPr,
  Note,
  Presence,
  RepoPaths,
  SearchGroup,
  Settling,
  Tab,
  Thread,
} from '../types'
import {
  AGENT_TYPE,
  DAILY_DEFAULT,
  ELSEWHERE_MS,
  LOCK_MS,
  MAX_ATTEMPTS,
  RUN_STALE_MS,
  autoStates,
  bySeverity,
  createArgs,
  createInput,
  contentKey,
  diffArgs,
  filesArgs,
  jsonLines,
  carried,
  deleteReviewArgs,
  isLockPath,
  lockArgs,
  lockPath,
  myReview,
  readLock,
  reviewBodyArgs,
  reviewCommentsArgs,
  nextJob,
  parseDaily,
  parseReview,
  parseSkills,
  placeFindings,
  reviewBody,
  reviewerPrompt,
  reviewerSpec,
  reviewsArgs,
  runName,
  severityCounts,
  sinceArgs,
  startedToday,
  tokensOf,
  trackHeads,
} from './autoreview'
import type { AutoSettings, GhComment, GhReview, PrFile } from './autoreview'
import { ACTIONS_FILE, MAX_PER_SCOPE, VARIABLES, builtInButtons, errorText, fillTemplate, mergeById, parseActions } from './actions'
import type { Vars } from './actions'
import { AUTO_ACTIONS, STALE_ACTIONS, CONFIRM_GUARD_MS, CONFIRM_MS, canMerge, checksHead, failedRunsArgs, headArgs, isAutoAction, issueActions, needsConfirm, prActions, rerunArgs, reviewActions, writeArgs } from './direct'
import { ACTIVITY_LIMIT, THREAD_JQ, UNDO_MS, byReason, hasNextPage, isThreadHidden, notificationsPath, pollAfter, shownThreads, splitResponse, threadKey, toThread } from './activity'
import type { RawThread } from './activity'
import { GROUP_HITS, GROUP_QUERY, bandSearchCount, groupQuery, resultOf, searchGroups, searchUrl, toHits } from './searches'
import type { GqlHit } from './searches'
import {
  CLAIM_MS,
  cacheKey,
  INBOX_FORMAT,
  INBOX_QUERY,
  RETRY_MS,
  ageColor,
  detailsText,
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
import type { GqlPr, PendingReview, PrDetail, SearchHit, Summary } from './inbox'
import { isLanguage, MESSAGES, pickLanguage } from './i18n'
import { BODY_CHARS, isSnoozed, keptNotes, matches, snoozeUntil } from './notes'
import { hereFirst, isHere, liveSessions, mainCheckout, mappedPath, olderSessions, parseRepoPaths, placeOf, remember, repoOf, shouldReload, thisRepos, workingOn } from './sessions'
import type { Place, ReloadRequest } from './sessions'
import type { Language, Messages } from './i18n'
import { isGatewayTimeout, readPages, SEARCH_LIMIT } from './pages'
import type { Page, Pages } from './pages'
import { STYLE_JQ, STYLE_PRS, STYLE_QUERY, STYLE_RETRY_MS, STYLE_RULES, learnedStyle, parseStyle, shouldBuildStyle, stylePrompt, styleQuery, styleRules, styleSamples } from './style'
import type { GqlReviewed, StyleFile } from './style'
import {
  REFERENCES_QUERY,
  AUTHORED_DAYS,
  ORDER,
  REFERENCE_DAYS,
  REFERENCE_PAGE,
  TAB_QUERIES,
  atLeast,
  BAND_KEYS,
  bandCounts,
  bandLabels,
  droppedCounts,
  isIssueHidden,
  isPrHidden,
  issueAlerts,
  issueHide,
  issueHideKey,
  issueKey,
  awayText,
  prAlertText,
  prAlerts,
  prHide,
  prHideKey,
  prSeenKeys,
  reviewers,
  referencesQuery,
  stateColor,
  tabQueries,
  taskOf,
  taskPrompts,
  toIssues,
  toMyPrs,
  toReferences,
  workWhere,
} from './tabs'
import type { BandCounts, GqlMyPr, GqlReferenced, GqlTouched, Task } from './tabs'

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
const repos = atom({ plugin: 'review-inbox', key: 'repos' } as const, {} as RepoPaths)
// The cards whose review request is in the prompt, so pressing Review again adds nothing.
// PRs Review was pressed on since the drawer opened, filled when it closes; requested ones the draft already asked for when it opened.
const added = atom({ plugin: 'review-inbox', key: 'added' } as const, [] as string[])
const requested = atom({ plugin: 'review-inbox', key: 'requested' } as const, [] as string[])
const onlyHere = atom({ plugin: 'review-inbox', key: 'onlyHere' } as const, false)
const reloadAsked = atom({ plugin: 'review-inbox', key: 'reloadAsked' } as const, '')
const dropped = atom({ plugin: 'review-inbox', key: 'dropped' } as const, [] as string[])
const actions = atom({ plugin: 'review-inbox', key: 'actions' } as const, { buttons: [], groups: [], errors: [] } as Actions)
const groupResults = atom({ plugin: 'review-inbox', key: 'groups' } as const, {} as Record<string, GroupResult>)
const activity = atom({ plugin: 'review-inbox', key: 'activity' } as const, { threads: [] } as Activity)
const settling = atom({ plugin: 'review-inbox', key: 'settling' } as const, {} as Record<string, Settling>)
const settleErrors = atom({ plugin: 'review-inbox', key: 'settleErrors' } as const, {} as Record<string, string>)
const more = atom({ plugin: 'review-inbox', key: 'more' } as const, '')
const seenAt = atom({ plugin: 'review-inbox', key: 'seenAt' } as const, 0)
const confirming = atom({ plugin: 'review-inbox', key: 'confirming' } as const, null as Confirming | null)
const directs = atom({ plugin: 'review-inbox', key: 'directs' } as const, {} as Record<string, DirectResult>)
const autoReview = atom({ plugin: 'review-inbox', key: 'autoReview' } as const, { jobs: {} } as AutoReviewFile)

type Options = {
  scope?: string
  githubUser?: string
  language?: string
  refreshMinutes?: string
  repoPaths?: string
  motion?: string
  directActions?: string
  autoReview?: string
  autoReviewModel?: string
  autoReviewDaily?: string
  autoReviewSkills?: string
}

// A band count that goes down shows in the success color this long; no tween, nothing moves.
const FLASH_MS = 250

let config = { scope: '', githubUser: '', language: 'en' as Language, refreshMs: 10 * 60_000, repoPaths: {} as Record<string, string>, motion: 'auto', directActions: false, auto: { isOn: false, daily: DAILY_DEFAULT } as AutoSettings, autoModel: 'sonnet', autoSkills: [] as string[] }
// Off by the motion option, or under auto by Claude Code's prefersReducedMotion setting.
let isStill = false
let lastBand: BandCounts | undefined
// GH_REPO, which gh itself treats as the current repository.
let ghRepo: string | undefined
// Where actions.json lives, shown by /review-inbox buttons.
let actionsPath = ''
// A press of a card's own button is added as the card's key and the button's id.
const buttonKey = (key: string, id: string) => `${key}::${id}`
// The Merge button fills the prompt like a card's own button, under an id actions.json cannot give one.
const MERGE = '@merge'
let languageOption: string | undefined
let m: Messages = MESSAGES.en
let isFetching = false
let terminalColumns = 160
// What this session has already shown; undefined until its first look, which compares with the last session's instead.
let shownKeys: string[] | undefined
let shownPrKeys: string[] | undefined
let shownIssueKeys: string[] | undefined
// What any session last saw, shared through shownFile, and what this one last wrote there.
type Shown = { reviews?: string[]; prs?: string[]; issues?: string[] }
let shownWritten = ''
let shownSnoozed: string[] | undefined
// What the open note field holds; a button beside it saves this.
let draft = ''
// A button's or a command's dispatch ends before a fetch would, so they only ask; the session's timer does it.
let wanted: 'sync' | 'fetch' | undefined
let toastFreeAt = 0
const sessionToken = Math.random().toString(36).slice(2)
// The session's own id, which a reload keeps, and the PRs its prompts linked to.
let selfId = ''
// When this load of the module started; a reload request older than this is not for it.
let loadedAt = 0
let linked: string[] = []
// This session's release, from plugin.json, so other sessions can tell it is current.
let version: string | undefined
// Shortens the folders shown on cards to ~.
let home = ''

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
const inboxFile = () => `inbox-${cacheKey(config.githubUser, config.scope, config.language)}-f${INBOX_FORMAT}.json`
// Keyed like the inbox: a hide prunes the entries its own list no longer has, so it must not share a file with another list.
const hiddenFile = () => `hidden-${cacheKey(config.githubUser, config.scope, config.language)}.json`
// Not keyed by language: a note I wrote stays when the language changes.
const notesFile = () => `notes-${cacheKey(config.githubUser, config.scope)}.json`
// Not keyed by language either: the last close of the drawer is the same whatever it was drawn in.
const seenFile = () => `seen-${cacheKey(config.githubUser, config.scope)}.json`
// Card keys carry no language, so the news a session announced holds whatever the language.
const shownFile = () => `shown-${cacheKey(config.githubUser, config.scope)}.json`
const styleFile = () => `style-${cacheKey(config.githubUser, config.scope, config.language)}.json`
// Not by language: a job is the same whatever language the cards are drawn in.
const autoFile = () => `autoreview-${cacheKey(config.githubUser, config.scope)}.json`
// One for every account: a session's branch and links say nothing about who is signed in.
const SESSIONS_FILE = 'sessions.json'
const RELOAD_FILE = 'reload.json'
// Also one for every account: a folder holds the same repository whoever is signed in.
const REPOS_FILE = 'repos.json'

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

async function gh($: EngineInterface, args: string[], env: Record<string, string>, stdin?: string) {
  const run = await $.process.run(['gh', ...args], { env, timeoutMs: 120_000, ...(stdin === undefined ? {} : { stdin }) })
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

// One search, read a page at a time; `jq` cuts each page below gh's output cap.
function searchAll<T>($: EngineInterface, query: string, vars: Record<string, string>, env: Record<string, string>, limit: number, jq = '.data', pageSize?: number) {
  const fields = Object.entries(vars).flatMap(([name, value]) => ['-f', `${name}=${value}`])
  return readPages<T>(
    async (first, after) =>
      JSON.parse(
        await gh($, ['api', 'graphql', '-f', `query=${query}`, ...fields, '-F', `first=${first}`, ...(after ? ['-f', `after=${after}`] : []), '--jq', jq], env),
      ) as Page<T>,
    limit,
    pageSize,
  )
}

// Lists fetched so far, merged into the claimed file as each one arrives.
type Save = (lists: Partial<InboxFile>) => Promise<void>

const trimBodies = (chars: number) => `.data | .search.nodes |= map(if .body then .body |= .[:${chars}] else . end)`

async function ghEnv($: EngineInterface): Promise<Record<string, string>> {
  if (!config.githubUser) return {}
  return { GH_TOKEN: (await gh($, ['auth', 'token', '-u', config.githubUser], {})).trim() }
}

async function fetchTabs(
  $: EngineInterface,
  env: Record<string, string>,
  previous: IssueItem[],
  save: Save,
): Promise<{ mine: MyPr[]; issues: IssueItem[]; capped: Capped }> {
  const q = tabQueries(config.scope)
  const tabSearch = <T,>(key: keyof typeof q): Promise<Pages<T>> => searchAll($, TAB_QUERIES[key], { q: q[key] }, env, SEARCH_LIMIT, trimBodies(BODY_CHARS))
  const [minePrs, assigned, mentioned] = await Promise.all([tabSearch<GqlMyPr>('mine'), tabSearch<GqlTouched>('assigned'), tabSearch<GqlTouched>('mentioned')])
  const me = minePrs.login ?? assigned.login ?? ''
  const real = <T,>(nodes: Partial<T & { number: number }>[]) =>
    nodes.filter((n): n is T & { number: number } => typeof n.number === 'number')
  const mine = toMyPrs(real<GqlMyPr>(minePrs.nodes), me)
  const withReferences = (references: IssueItem[]) => toIssues(real<GqlTouched>(assigned.nodes), real<GqlTouched>(mentioned.nodes), references)
  const capped = { mine: minePrs.capped, issues: assigned.capped || mentioned.capped }
  const lastReferences = previous.filter(i => i.kind === 'reference')
  // References are the slowest search, so the other lists show first, beside the last references.
  await save({ mine, issues: withReferences(lastReferences), capped })

  const since = new Date(Date.now() - REFERENCE_DAYS * 86_400_000).toISOString()
  const touchedSince = new Date(Date.now() - AUTHORED_DAYS * 86_400_000).toISOString()
  let references: IssueItem[]
  try {
    // ponytail: at most 500 items touched in the window, newest first; past that the rest are left out
    const referenced: Pages<GqlReferenced> = await searchAll($, REFERENCES_QUERY, { q: referencesQuery(config.scope, touchedSince), since }, env, 500, '.data', REFERENCE_PAGE)
    references = toReferences(real<GqlReferenced>(referenced.nodes), me)
  } catch {
    // References are the costliest search; when GitHub refuses it, keep the last ones instead of failing every tab.
    references = lastReferences
  }

  return { mine, issues: withReferences(references), capped }
}

async function fetchInbox(
  $: EngineInterface,
  env: Record<string, string>,
  previous: InboxItem[],
  heartbeat: () => Promise<void>,
): Promise<{ items: InboxItem[]; capped: boolean }> {
  const found: Pages<GqlPr> = await searchAll($, INBOX_QUERY, { q: searchQuery(config.scope) }, env, SEARCH_LIMIT, trimBodies(12_000))
  const me = found.login ?? ''
  // Search can return non-PR nodes as empty objects.
  const prs = found.nodes.filter((n): n is GqlPr => typeof n.number === 'number')
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
          ...(pr.author?.__typename === 'Bot' ? { isBot: true as const } : {}),
          createdAt: pr.createdAt,
          ...(pr.updatedAt ? { updatedAt: pr.updatedAt } : {}),
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
  return { items: sortItems(next), capped: found.capped }
}

// Each group is its own paged search, three at a time; one that fails keeps its error and leaves the others.
async function fetchGroups($: EngineInterface, env: Record<string, string>): Promise<Record<string, GroupResult>> {
  // Read here too: the fetching session may have opened no drawer since the file changed.
  await loadActions($)
  const { groups } = searchGroups(m, (await read($, actions)).groups)
  const results: Record<string, GroupResult> = {}
  for (let i = 0; i < groups.length; i += 3) {
    await Promise.all(
      groups.slice(i, i + 3).map(async group => {
        const q = groupQuery(group)
        try {
          const found: Pages<GqlHit> = await searchAll($, GROUP_QUERY, { q }, env, GROUP_HITS)
          results[group.id] = { query: q, count: found.count ?? found.nodes.length, hits: toHits(found.nodes) }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          results[group.id] = { query: q, count: 0, hits: [], error: isGatewayTimeout(message) ? m.status.timeout : message }
        }
      }),
    )
  }
  return results
}

// The notifications, newest first; GitHub's poll interval or an unchanged list (a 304) keeps the last ones.
async function fetchActivity($: EngineInterface, env: Record<string, string>, prev: Activity | undefined): Promise<Activity> {
  const now = Date.now()
  if (prev?.pollAfter !== undefined && now < prev.pollAfter) return prev
  const threads: Thread[] = []
  let first: Record<string, string> = {}
  const unchanged = prev?.lastModified && !prev.error && !prev.noAccess ? ['-H', `If-Modified-Since: ${prev.lastModified}`] : []
  try {
    for (let page = 1; threads.length < ACTIVITY_LIMIT; page++) {
      const { headers, body } = splitResponse(await gh($, ['api', '-i', ...(page === 1 ? unchanged : []), notificationsPath(page, now), '--jq', THREAD_JQ], env))
      if (page === 1) first = headers
      threads.push(...(JSON.parse(body || '[]') as RawThread[]).map(toThread))
      if (!hasNextPage(headers)) break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // A 304 has no body, so gh's --jq fails on it before gh reports the status.
    if (prev && unchanged.length > 0 && /HTTP 304|unexpected end of JSON input/.test(message)) return prev
    if (/HTTP 40[34]/.test(message)) return { threads: [], noAccess: true }
    return { threads: prev?.threads ?? [], error: isGatewayTimeout(message) ? m.status.timeout : message }
  }
  const lastModified = first['last-modified']
  const after = pollAfter(first, now)
  return { threads: threads.slice(0, ACTIVITY_LIMIT), ...(lastModified ? { lastModified } : {}), ...(after ? { pollAfter: after } : {}) }
}

const without = <T,>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([k]) => k !== key))

// Done or Unsubscribe pressed: the row waits out its Undo, then this sends it.
async function settleLater($: EngineInterface, thread: Thread, kind: Settling['kind']) {
  const at = Date.now()
  await update($, settleErrors, errors => without(errors, thread.id))
  await update($, settling, s => ({ ...s, [thread.id]: { kind, at } }))
  $.clock.after(UNDO_MS, () => void settle($, thread.id, at))
}

const sending = new Set<string>()

// `at` is the press the timer belongs to; the drawer's close sends every pending one without it. A failure brings the row back with the error.
async function settle($: EngineInterface, id: string, at?: number) {
  const pending = (await read($, settling))[id]
  if (!pending || (at !== undefined && pending.at !== at) || sending.has(id)) return
  sending.add(id)
  try {
    const env = await ghEnv($)
    if (pending.kind === 'unsubscribe') await gh($, ['api', '-X', 'DELETE', `notifications/threads/${id}/subscription`], env)
    await gh($, ['api', '-X', 'DELETE', `notifications/threads/${id}`], env)
    const thread = (await read($, activity)).threads.find(t => t.id === id)
    if (thread) await setHidden($, hideMap => ({ ...hideMap, [threadKey(thread)]: thread.updatedAt }))
  } catch (error) {
    await update($, settleErrors, errors => ({ ...errors, [id]: error instanceof Error ? error.message : String(error) }))
  } finally {
    sending.delete(id)
    await update($, settling, s => without(s, id))
  }
}

// Who a write goes out as, named on its confirm row: the configured account, else gh's active one.
let login: Promise<string> | undefined
function loginName($: EngineInterface) {
  login ??= ghEnv($).then(env => gh($, ['api', 'user', '--jq', '.login'], env)).then(text => text.trim())
  // A failed look is tried again at the next press.
  login.catch(() => (login = undefined))
  return login
}

const setDirect = ($: EngineInterface, key: string, result: DirectResult | undefined) =>
  update($, directs, d => (result ? { ...d, [key]: result } : without(d, key)))

// A write others see asks first, on the card; the focus goes to Cancel, so a stray Enter does nothing.
async function pressDirect($: EngineInterface, key: string, action: DirectAction, target: DirectTarget) {
  if (!needsConfirm(action)) return sendDirect($, key, action, target)
  const at = await $.clock.now()
  await setDirect($, key, undefined)
  await update($, confirming, () => ({ key, action, target, at }))
  void $.ui.focus({ requestId: PANE, key: `direct-cancel-${key}` }).catch(() => undefined)
  $.clock.after(CONFIRM_MS, () => void update($, confirming, c => (c?.at === at ? null : c)))
  const name = await loginName($).catch(() => '')
  await update($, confirming, c => (c?.at === at ? { ...c, login: name } : c))
}

async function confirmDirect($: EngineInterface) {
  const asking = await read($, confirming)
  if (!asking || (await $.clock.now()) - asking.at < CONFIRM_GUARD_MS) return
  await update($, confirming, () => null)
  await sendDirect($, asking.key, asking.action, asking.target)
}

// The mod's own refusal, shown as it is rather than as GitHub's.
class Refused extends Error {}
const writing = new Set<string>()

// The card shows the write going, then how it went; a failure stays on the card until the next press.
async function sendDirect($: EngineInterface, key: string, action: DirectAction, target: DirectTarget) {
  if (writing.has(key)) return
  writing.add(key)
  await setDirect($, key, { action, phase: 'sending', at: Date.now() })
  try {
    const env = await ghEnv($)
    // GitHub takes an approval of an older commit, so a head that moved since I looked stops it here.
    if (checksHead(action) && (await gh($, headArgs(target), env)).trim() !== target.sha) {
      throw new Refused(m.direct.newCommits)
    }
    if (action === 'rerun') {
      const runs = (await gh($, failedRunsArgs(target), env)).split('\n').filter(Boolean)
      if (runs.length === 0) throw new Refused(m.direct.noRun)
      for (const run of runs) await gh($, rerunArgs(target, run), env)
    } else {
      await gh($, writeArgs(action, target, action === 'assign' ? await loginName($) : ''), env)
    }
    // My pending review is gone, posted or deleted: this head is not reviewed again, unless I asked for that.
    if (action === 'review-again') await runAuto($, key)
    else if (target.reviewId) await setJob($, key, { ...IDLE, status: 'closed', reviewId: undefined, result: undefined })
    const at = Date.now()
    await setDirect($, key, { action, phase: 'done', at, ...(action === 'assign' ? { undo: true } : {}) })
    $.ui.toast(`${m.direct.done[action]} · ${target.repo} #${target.number}`)
    if (action !== 'assign') wanted = 'fetch'
    // Fetched only once the Undo is gone: the card would move to Assigned and take its Undo with it.
    else
      $.clock.after(UNDO_MS, async () => {
        await update($, directs, d => {
          const result = d[key]
          return result?.at === at ? { ...d, [key]: { ...result, undo: false } } : d
        })
        wanted = 'fetch'
      })
  } catch (error) {
    const message = error instanceof Refused ? error.message : m.direct.failed(error instanceof Error ? error.message : String(error))
    await setDirect($, key, { action, phase: 'failed', at: Date.now(), message })
  } finally {
    writing.delete(key)
  }
}

// Assign me is the one write with an opposite, so its Undo really takes it back.
async function undoAssign($: EngineInterface, key: string, target: DirectTarget) {
  try {
    await gh($, writeArgs('assign', target, await loginName($), true), await ghEnv($))
    await setDirect($, key, undefined)
  } catch (error) {
    await setDirect($, key, { action: 'assign', phase: 'failed', at: Date.now(), message: m.direct.failed(error instanceof Error ? error.message : String(error)) })
  }
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
  const file = await readJson($, styleFile(), {} as StyleFile)
  if (file === undefined || !shouldBuildStyle(file, Date.now())) return
  try {
    const reviewed: Pages<GqlReviewed> = await searchAll($, STYLE_QUERY, { q: styleQuery(config.scope) }, env, STYLE_PRS, STYLE_JQ)
    const samples = styleSamples(reviewed.nodes, reviewed.login ?? '')
    const prompt = stylePrompt(samples)
    if (prompt === undefined) {
      await writeJson($, styleFile(), { rules: STYLE_RULES, checkedAt: Date.now(), samples: samples.length } satisfies StyleFile)
      return
    }
    const reply = await ask($, styleRules(config.language), prompt, 400)
    const profile = reply.text === undefined ? undefined : parseStyle(reply.text)
    if (profile === undefined) throw new Error(reply.reason ?? 'empty reply')
    await writeJson($, styleFile(), { profile, rules: STYLE_RULES, checkedAt: Date.now(), samples: samples.length } satisfies StyleFile)
  } catch {
    await writeJson($, styleFile(), { ...file, retryAt: Date.now() + STYLE_RETRY_MS } satisfies StyleFile).catch(() => undefined)
  }
}

// The fetching session records each head it sees, so every session counts the same wait from the same moment.
async function trackAuto($: EngineInterface, list: InboxItem[]) {
  if (!config.auto.isOn) return
  const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
  if (file === undefined) return
  const next = trackHeads(file, list, Date.now())
  if (JSON.stringify(next) !== JSON.stringify(file)) await writeJson($, autoFile(), next)
  await update($, autoReview, () => next)
  // A run whose job went is never stored; its session stops the subagent on its next tick, and its folder goes now.
  for (const [key, job] of Object.entries(file.jobs)) if (job.status === 'running' && next.jobs[key] !== job) await removeRun($, job)
}

// Turning the setting on is what older requests are measured against; turning it off forgets it, so on again starts afresh.
async function syncEnabled($: EngineInterface) {
  const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
  if (file === undefined) return
  if (config.auto.isOn === (file.enabledAt !== undefined)) return update($, autoReview, () => file)
  const { enabledAt: _, ...off } = file
  const next = config.auto.isOn ? { ...file, enabledAt: Date.now() } : off
  await writeJson($, autoFile(), next)
  await update($, autoReview, () => next)
  if (config.auto.isOn) toast($, m.auto.turnedOn(config.auto.daily === undefined ? m.auto.unlimited : `${config.auto.daily}`))
}

// A run asked for by hand skips the wait, the size limit and the daily limit, for this head only; it is also Try again.
async function runAuto($: EngineInterface, key: string) {
  const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
  const job = file?.jobs[key]
  if (!file || !job) return
  // Try again after a failure starts afresh.
  const next = { ...file, jobs: { ...file.jobs, [key]: { ...job, manual: true as const, status: undefined, attempts: 0, error: undefined, reviewId: undefined, staleFrom: undefined, prev: undefined, elsewhere: undefined } } }
  await writeJson($, autoFile(), next)
  await update($, autoReview, () => next)
}

// Read, changed and written whole; `change` answering undefined writes nothing.
async function editAuto($: EngineInterface, change: (file: AutoReviewFile) => AutoReviewFile | undefined) {
  const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
  const next = file && change(file)
  if (!next) return undefined
  await writeJson($, autoFile(), next)
  await update($, autoReview, () => next)
  return next
}

// With `head`, only while the job is still that head's: a new head replaces the job, and a run of the old one must not write into it.
const setJob = ($: EngineInterface, key: string, fields: Partial<AutoJob>, head?: string) =>
  editAuto($, file => {
    const job = file.jobs[key]
    return job && (head === undefined || job.headSha === head) ? { ...file, jobs: { ...file.jobs, [key]: { ...job, ...fields } } } : undefined
  })

// A job no run holds: undefined fields are left out when the file is written.
const IDLE = { status: undefined, agentId: undefined, runner: undefined, folder: undefined, checkout: undefined, lock: undefined, elsewhere: undefined }

const prOf = (key: string) => {
  const at = key.lastIndexOf('#')
  return { repo: key.slice(0, at), number: Number(key.slice(at + 1)) }
}

// The 👀 comes off first, so my other machines may review the PR; then the worktree, so the checkout forgets it; then the folder.
async function removeRun($: EngineInterface, job: AutoJob) {
  if (job.lock && isLockPath(job.lock)) await gh($, ['api', '-X', 'DELETE', job.lock], await ghEnv($)).catch(() => undefined)
  // The path comes from a shared file: nothing outside the mod's own runs folder is ever removed.
  if (!job.folder?.startsWith(`${await cacheDir($)}/runs/`) || job.folder.includes('..')) return
  const run = (argv: string[]) => $.process.run(argv, { timeoutMs: 60_000 }).catch(() => undefined)
  if (job.checkout) await run(['git', '-C', job.checkout, 'worktree', 'remove', '--force', `${job.folder}/repo`])
  // shortcut: rm is POSIX only, as mv is above; on Windows without WSL a run folder stays behind
  await run(['rm', '-rf', job.folder])
}

// A run that failed: once more while attempts remain, else the card says why and offers Try again.
async function failRun($: EngineInterface, key: string, error: string) {
  const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
  const job = file?.jobs[key]
  if (!job) return
  await removeRun($, job)
  const attempts = (job.attempts ?? 0) + 1
  await setJob($, key, attempts < MAX_ATTEMPTS ? { ...IDLE, attempts } : { ...IDLE, attempts, status: 'failed', error }, job.headSha)
}

// My pending review moved from an older commit with the same content: read as it is now (my edits on GitHub kept), deleted, made again on the head.
async function carryReview($: EngineInterface, key: string, item: InboxItem, prev: NonNullable<AutoJob['prev']>, files: PrFile[], env: Record<string, string>) {
  const body = (await gh($, reviewBodyArgs(item, prev.reviewId), env)).replace(/\n$/, '')
  const comments = jsonLines<GhComment>(await gh($, reviewCommentsArgs(item, prev.reviewId), env))
  const moved = carried(body, comments, prev.headSha, item.headSha)
  const create = (head: string, review: ReturnType<typeof carried>) => gh($, createArgs(item), env, createInput(head, review.body, review.comments))
  // GitHub takes no second pending review, so the old one goes first; a refused create puts it back where it was.
  await gh($, deleteReviewArgs(item, prev.reviewId), env)
  const id = await create(item.headSha, moved).catch(async (error: unknown) => {
    await create(prev.headSha, carried(body, comments, prev.headSha, prev.headSha)).catch(() => undefined)
    throw error
  })
  await setJob(
    $,
    key,
    { ...IDLE, status: 'done', reviewId: Number(id.trim()), contentKey: contentKey(files), carriedFrom: prev.headSha, prev: undefined, ...(prev.result ? { result: prev.result } : {}) },
    item.headSha,
  )
}

// The repository's folder, fetched and checked out at the head beside the diff; undefined leaves the diff alone to read.
async function addCheckout($: EngineInterface, item: InboxItem, folder: string): Promise<string | undefined> {
  const place = await placeFor($, item.repo)
  const path = place.kind === 'here' ? await $.session.cwd() : place.kind === 'folder' ? place.path : undefined
  if (path === undefined) return undefined
  const git = (args: string[]) => $.process.run(['git', '-C', path, ...args], { timeoutMs: 120_000 }).catch(() => undefined)
  if ((await git(['fetch', '--quiet', 'origin', `pull/${item.number}/head`]))?.exitCode !== 0) return undefined
  // Detached and inside the mod's folder: nothing in my checkout changes but its list of worktrees.
  return (await git(['worktree', 'add', '--detach', `${folder}/repo`, item.headSha]))?.exitCode === 0 ? path : undefined
}

// My 👀 on the PR, added now or taken over from a machine that stopped an hour ago; no path when the repository takes no reactions, and the run goes ahead.
async function takeLock($: EngineInterface, pr: InboxItem, env: Record<string, string>): Promise<{ path?: string } | { elsewhere: number }> {
  const add = async () => readLock(await gh($, lockArgs(pr), env).catch(() => ''))
  let lock = await add()
  if (lock && !lock.isNew && Date.now() - lock.createdAt > LOCK_MS) {
    // shortcut: two machines taking over the same stale 👀 at once both review; it needs a machine to stop mid-review first
    await gh($, ['api', '-X', 'DELETE', lockPath(pr, lock.id)], env).catch(() => undefined)
    lock = await add()
  }
  if (lock && !lock.isNew) return { elsewhere: lock.createdAt }
  return lock ? { path: lockPath(pr, lock.id) } : {}
}

// Started by the session that won the runner claim. GitHub is asked first: another machine may have reviewed this head already.
async function startRun($: EngineInterface, key: string) {
  const item = (await read($, items)).find(i => itemKey(i) === key)
  if (!item) return void (await setJob($, key, IDLE))
  try {
    const env = await ghEnv($)
    const mineNow = myReview(jsonLines<GhReview>(await gh($, reviewsArgs(item), env)), await loginName($), item.headSha)
    const files = jsonLines<PrFile>(await gh($, filesArgs(item), env))
    // My pending review on an older commit: carried when the content is unchanged, else the card offers Review again. No model call either way.
    if (mineNow?.kind === 'pending' && mineNow.commit !== item.headSha) {
      const prev = (await read($, autoReview)).jobs[key]?.prev
      if (prev?.reviewId === mineNow.id && prev.contentKey === contentKey(files)) return await carryReview($, key, item, prev, files, env)
      return void (await setJob($, key, { ...IDLE, status: 'stale', reviewId: mineNow.id, staleFrom: mineNow.commit }, item.headSha))
    }
    if (mineNow) return void (await setJob($, key, { ...IDLE, status: 'done', ...(mineNow.kind === 'pending' ? { reviewId: mineNow.id } : {}) }, item.headSha))
    const lock = await takeLock($, item, env)
    if ('elsewhere' in lock) return void (await setJob($, key, { ...IDLE, elsewhere: { since: lock.elsewhere, until: Date.now() + ELSEWHERE_MS } }, item.headSha))
    // Stored before anything can fail, so every way out of the run takes it off again.
    if (lock.path) await setJob($, key, { lock: lock.path }, item.headSha)
    const folder = `${await cacheDir($)}/runs/${runName(key, item.headSha)}`
    await $.fs.write(`${folder}/pr.diff`, await gh($, diffArgs(item), env))
    if (item.reviewedSha && item.reviewedSha !== item.headSha) await $.fs.write(`${folder}/since.diff`, await gh($, sinceArgs(item, item.reviewedSha, item.headSha), env))
    await setJob($, key, { folder, contentKey: contentKey(files), heartbeatAt: Date.now() }, item.headSha)
    const checkout = await addCheckout($, item, folder)
    if (checkout) await setJob($, key, { checkout, heartbeatAt: Date.now() }, item.headSha)
    await $.agent.register(reviewerSpec(config.autoModel, config.autoSkills))
    const style = learnedStyle(await readJson($, styleFile(), {} as StyleFile))
    const name = `auto-review-${runName(key, item.headSha)}`
    const spawned = await $.agent.spawn({
      name,
      subagentType: AGENT_TYPE,
      description: `Auto review ${item.repo} #${item.number}`,
      prompt: reviewerPrompt(item, { hasCheckout: checkout !== undefined, ...(style ? { style } : {}), language: m.model.language }),
      model: config.autoModel,
      cwd: folder,
    })
    if (spawned.deny !== undefined) throw new Error(spawned.deny)
    // A spawn a hook answered carries no id (the engine sets it); the agent list still names the run.
    const agentId = spawned.agentId ?? (await $.agent.list()).find(a => a.name === name)?.id
    if (!agentId) throw new Error('no agent started')
    const today = new Date().toDateString()
    await editAuto($, file => {
      const job = file.jobs[key]
      if (job?.headSha !== item.headSha) return undefined
      return { ...file, day: today, started: startedToday(file, Date.now()) + 1, jobs: { ...file.jobs, [key]: { ...job, agentId, heartbeatAt: Date.now() } } }
    })
  } catch (error) {
    await failRun($, key, error instanceof Error ? error.message : String(error))
  }
}

// Stores the subagent's answer as my pending review on the head it read, unless one of mine got there first.
async function finishRun($: EngineInterface, agentId: string, answer: string, tokens: number | undefined, isAborted: boolean) {
  const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
  const found = Object.entries(file?.jobs ?? {}).find(([, j]) => j.agentId === agentId && j.status === 'running')
  if (!found) return
  const [key, job] = found
  // Stopped from the task list, say: started again it would only spend the tokens again, so it waits for Try again.
  if (isAborted) {
    await removeRun($, job)
    return void (await setJob($, key, { ...IDLE, status: 'failed', error: m.auto.stopped }, job.headSha))
  }
  const result = parseReview(answer)
  if (!result) return failRun($, key, m.auto.unreadable)
  const pr = prOf(key)
  try {
    const env = await ghEnv($)
    const pendingId = async () => {
      const mineNow = myReview(jsonLines<GhReview>(await gh($, reviewsArgs(pr), env)), await loginName($), job.headSha)
      return mineNow ? (mineNow.kind === 'pending' ? mineNow.id : -1) : undefined
    }
    let reviewId = await pendingId()
    if (reviewId === undefined) {
      const { comments, rest } = placeFindings(jsonLines<PrFile>(await gh($, filesArgs(pr), env)), result.findings)
      const body = reviewBody(result.summary, rest, job.headSha, job.contentKey ?? '')
      // GitHub allows one pending review a PR: a create refused because another machine made one adopts that one.
      reviewId = await gh($, createArgs(pr), env, createInput(job.headSha, body, comments)).then(
        id => Number(id.trim()),
        async (error: unknown) => {
          const adopted = await pendingId()
          if (adopted === undefined) throw error
          return adopted
        },
      )
    }
    await removeRun($, job)
    await setJob($, key, { ...IDLE, status: 'done', result, ...(reviewId > 0 ? { reviewId } : {}), ...(tokens ? { tokens } : {}) }, job.headSha)
    toast($, `${m.auto.finished(m.auto.verdicts[result.verdict])} · ${pr.repo} #${pr.number}`)
  } catch (error) {
    await failRun($, key, error instanceof Error ? error.message : String(error))
  }
}

let isTicking = false
// The running job this session last found quiet, as `key@startedAt`.
let quietRun: string | undefined
const LIVE = ['pending', 'running', 'waiting']

// Every session looks at the shared file on the sync timer; only a local read until a job is due. One review runs at a time across sessions.
async function tickAuto($: EngineInterface) {
  if (!config.auto.isOn || isTicking) return
  isTicking = true
  try {
    const file = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
    if (!file) return
    // A reviewer of mine no running job holds lost its job to a new head, a closed PR or a withdrawn request: stopped, its result never stored.
    const held = new Set(Object.values(file.jobs).flatMap(j => (j.status === 'running' && j.agentId ? [j.agentId] : [])))
    for (const agent of await $.agent.list())
      if (agent.type === AGENT_TYPE && LIVE.includes(agent.status) && !held.has(agent.id)) await $.tool.call({ tool: 'TaskStop', task_id: agent.id }).catch(() => undefined)
    const running = Object.entries(file.jobs).find(([, j]) => j.status === 'running')
    if (running) {
      const [key, job] = running
      // The session whose agent list has the run renews it, a reload of the mod included; one gone quiet is requeued.
      const isMine = job.agentId !== undefined && (await $.agent.list()).some(a => a.id === job.agentId && LIVE.includes(a.status))
      const run = `${key}@${job.startedAt}`
      const isQuiet = !isMine && Date.now() - (job.heartbeatAt ?? 0) > RUN_STALE_MS
      if (isMine) await setJob($, key, { runner: sessionToken, heartbeatAt: Date.now() })
      // Its session closed: back to the front of the queue, not counted as an attempt. Quiet on two ticks in a row, as after a sleep every run is quiet until its session renews it.
      else if (isQuiet && quietRun === run) {
        await removeRun($, job)
        await setJob($, key, { ...IDLE, manual: true }, job.headSha)
      }
      quietRun = isQuiet ? run : undefined
      return
    }
    const key = nextJob(autoStates(file, await read($, items), config.auto, Date.now()))
    if (!key) return
    // As sync claims the fetch: write, wait, read back; the last claim written wins.
    await setJob($, key, { status: 'running', runner: sessionToken, startedAt: Date.now(), heartbeatAt: Date.now() })
    await $.clock.sleep(500)
    const settled = await readJson($, autoFile(), { jobs: {} } as AutoReviewFile)
    if (settled?.jobs[key]?.runner !== sessionToken) return
    await startRun($, key)
  } finally {
    isTicking = false
  }
}

// Every session runs this; only the one that finds the shared file stale and wins the claim goes to GitHub.
async function sync($: EngineInterface, force = false) {
  const file = await readJson($, inboxFile(), { items: [] } as InboxFile)
  if (file === undefined) return
  if (isFetching || !shouldFetch(file, Date.now(), force, config.refreshMs)) return show($, file)

  isFetching = true
  try {
    // Sessions started together all see the file stale; the last claim written wins, the others back off.
    const claim = { ...file, fetchingSince: Date.now(), fetchingBy: sessionToken }
    await writeJson($, inboxFile(), claim)
    await $.clock.sleep(500)
    const settled = await readJson($, inboxFile(), { items: [] } as InboxFile)
    if (settled?.fetchingBy !== sessionToken) return
    await show($, claim)

    // Each list is written as it arrives, which also renews the claim; writes go in order, and none after the fetch ends.
    let partial: InboxFile = claim
    let saving = Promise.resolve()
    let isDone = false
    const save: Save = lists => {
      if (isDone) return saving
      partial = { ...partial, ...lists, capped: { ...partial.capped, ...lists.capped }, fetchingSince: Date.now() }
      const next = partial
      // shortcut: a list write that fails is skipped; the final write below still lands, or the fetch fails as before
      saving = saving
        .then(async () => {
          await writeJson($, inboxFile(), next)
          await show($, next)
        })
        .catch(() => undefined)
      return saving
    }

    let result: InboxFile
    let env: Record<string, string> | undefined
    try {
      env = await ghEnv($)
      const [tabs, groups, notifications, fetched] = await Promise.all([
        fetchTabs($, env, file.issues ?? [], save),
        fetchGroups($, env).then(async found => (await save({ groups: found }), found)),
        fetchActivity($, env, file.activity).then(async found => (await save({ activity: found }), found)),
        fetchInbox($, env, file.items, () => save({})).then(async found => (await save({ items: found.items }), found)),
      ])
      result = { items: fetched.items, ...tabs, groups, activity: notifications, capped: { ...tabs.capped, review: fetched.capped }, fetchedAt: Date.now() }
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      const message = isGatewayTimeout(raw) ? m.status.timeout : raw
      // Keep the lists this fetch did get, the last good ones otherwise, and try again in a minute, not after a full refresh interval.
      result = { items: partial.items, mine: partial.mine, issues: partial.issues, groups: partial.groups, activity: partial.activity, capped: partial.capped, fetchedAt: file.fetchedAt ?? Date.now(), retryAt: Date.now() + RETRY_MS, error: message }
    }
    isDone = true
    await saving
    await writeJson($, inboxFile(), result)
    if (result.error === undefined) await trackAuto($, result.items).catch(() => undefined)
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
  const groupList = file.groups
  if (groupList) await update($, groupResults, () => groupList)
  const notifications = file.activity
  if (notifications) await update($, activity, () => notifications)
  await update($, status, () =>
    claimed
      ? { kind: 'loading' as const, updatedAt: file.fetchedAt }
      : file.error
        ? { kind: 'error' as const, message: file.error, updatedAt: file.fetchedAt }
        : { kind: 'ready' as const, updatedAt: file.fetchedAt },
  )
  const hiddenNow = await readJson($, hiddenFile(), {} as Record<string, string>)
  if (hiddenNow !== undefined) await update($, hidden, () => hiddenNow)
  const notesNow = await readJson($, notesFile(), {} as Record<string, Note>)
  if (notesNow !== undefined) await update($, notes, () => notesNow)
  const autoNow = config.auto.isOn ? await readJson($, autoFile(), { jobs: {} } as AutoReviewFile) : undefined
  if (autoNow !== undefined) await update($, autoReview, () => autoNow)

  // An empty file from before the first fetch, or an error result, must not become the baseline, or everything reads as new.
  if (claimed || file.fetchedAt === undefined || file.error !== undefined) return
  // A session's first look compares with what the last session saw, and sums up in one toast what changed while none was open.
  const isFirstLook = shownKeys === undefined
  // A stale file is about to be fetched again; taking it as the baseline would announce its news one by one after the fetch.
  if (isFirstLook && Date.now() - file.fetchedAt > config.refreshMs) return
  const last = isFirstLook ? await readJson($, shownFile(), {} as Shown) : undefined
  const fresh = newArrivals(shownKeys ?? last?.reviews, file.items)
  const prNews = prs ? prAlerts(shownPrKeys ?? last?.prs, prs) : []
  const newIssues = issueList ? issueAlerts(shownIssueKeys ?? last?.issues, issueList) : []
  if (isFirstLook) {
    const text = awayText(fresh.length, prNews, newIssues, m)
    if (text) toast($, text)
  } else {
    for (const item of fresh.slice(0, 3)) {
      toast($, `${m.toast.newRequest} · ${item.repo} #${item.number} · ${item.summary}`)
    }
    if (fresh.length > 3) toast($, m.toast.moreRequests(fresh.length - 3))
    for (const alert of prNews.slice(0, 3)) toast($, prAlertText(alert, m))
    if (prNews.length > 3) toast($, m.toast.morePrAlerts(prNews.length - 3))
    for (const issue of newIssues.slice(0, 3)) {
      toast($, `${m.issueKind[issue.kind]} · ${issue.repo} #${issue.number} · ${issue.title}`)
    }
    if (newIssues.length > 3) toast($, m.toast.moreIssueAlerts(newIssues.length - 3))
  }
  shownKeys = shownReady(file.items)
  if (prs) shownPrKeys = prSeenKeys(prs)
  if (issueList) shownIssueKeys = issueList.map(issueKey)
  const shown: Shown = { reviews: shownKeys, prs: shownPrKeys, issues: shownIssueKeys }
  if (JSON.stringify(shown) !== shownWritten) {
    shownWritten = JSON.stringify(shown)
    await writeJson($, shownFile(), shown).catch(() => undefined)
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
  await flashDrops($)
}

// What the band counts, after hides and snoozes: compared with the last count to flash a drop.
async function bandNow($: EngineInterface): Promise<BandCounts> {
  const away = awayTests(await read($, hidden), await read($, notes), Date.now())
  const reviews = (await read($, items)).filter(i => !i.isDraft && !away.review(i))
  const searches = bandSearchCount(searchGroups(m, (await read($, actions)).groups).groups, await read($, groupResults))
  return bandCounts(reviews.length, (await read($, mine)).filter(pr => !away.pr(pr)), (await read($, issues)).filter(i => !away.issue(i)), searches)
}

async function flashDrops($: EngineInterface) {
  const counts = await bandNow($)
  const drops = droppedCounts(lastBand, counts)
  lastBand = counts
  if (isStill || drops.length === 0) return
  await update($, dropped, () => drops)
  $.clock.after(FLASH_MS, () => void update($, dropped, () => []))
}

// Read as the drawer opens, not while it is up, so a card stays marked until it closes.
async function loadSeen($: EngineInterface) {
  const seen = await readJson($, seenFile(), {} as { at?: number })
  await update($, seenAt, () => seen?.at ?? 0)
}

async function openDrawer($: EngineInterface) {
  // Opening an open drawer only brings it forward; its picks wait for the close that fills them.
  if (!(await $.ui.panes()).some(p => p.id === PANE)) {
    // What the draft already asks for shows as added; a sent or cleared draft frees the cards again.
    const { text } = await $.prompt.read()
    const cards = await pickable($)
    await update($, requested, () => cards.filter(c => hasRequest(text, c.url)).map(c => c.key))
    await update($, added, () => [])
    await loadSeen($)
    await loadActions($)
    // A group added or edited since the last fetch has nothing to show yet.
    const results = await read($, groupResults)
    if (searchGroups(m, (await read($, actions)).groups).groups.some(g => !resultOf(g, results))) wanted = 'fetch'
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

type Pickable = { key: string; url: string; review?: InboxItem; task?: Task }

// Every card Review or a task button can pick, by the key its hide and note use.
async function pickable($: EngineInterface): Promise<Pickable[]> {
  const task = (card: MyPr | IssueItem, key: string): Pickable[] => {
    const kind = taskOf(card)
    const base = 'base' in card ? card.base : undefined
    return kind ? [{ key, url: card.url, task: { kind, repo: card.repo, url: card.url, ...(base ? { base } : {}) } }] : []
  }
  return [
    ...(await read($, items)).map(i => ({ key: itemKey(i), url: i.url, review: i })),
    ...(await read($, mine)).flatMap(pr => task(pr, prHideKey(pr))),
    ...(await read($, issues)).flatMap(i => task(i, issueHideKey(i))),
  ]
}

// This session's folder when it holds the repository, else the one remembered for it while that folder is still there.
async function placeFor($: EngineInterface, repo: string): Promise<Place> {
  const place = placeOf(repo, (await read($, sessions))[selfId], await read($, repos), mappedPath(repo, config.repoPaths, home))
  return place.kind === 'folder' && !(await $.fs.exists(place.path)) ? { kind: 'unknown' } : place
}

// Filling the prompt takes the keyboard from the drawer, so Review and the task buttons only mark a card and the drawer's close fills them all.
async function addCard($: EngineInterface, key: string) {
  const keys = await read($, added)
  if (keys.includes(key) || (await read($, requested)).includes(key)) return
  await update($, added, () => [...keys, key])
  $.ui.toast(m.toast.added(keys.length + 1))
}

// Read at each drawer open and each /review-inbox buttons, so an edit to the file shows without a restart.
async function loadActions($: EngineInterface) {
  actionsPath = `${await cacheDir($)}/${ACTIONS_FILE}`
  const text = (await $.fs.exists(actionsPath)) ? await $.fs.read(actionsPath).catch(() => '') : undefined
  await update($, actions, () => parseActions(text))
}

// Scopes with more buttons than a row can take in at a glance.
const crowdedScopes = (buttons: { scope: ButtonScope }[]) =>
  (['review', 'pr', 'issue'] as const)
    .map(scope => [scope, buttons.filter(b => b.scope === scope).length] as const)
    .filter(([, n]) => n > MAX_PER_SCOPE)

// What /review-inbox buttons prints: the file, what of mine it holds, and each entry left out with its reason.
async function buttonsReport($: EngineInterface): Promise<string> {
  await loadActions($)
  const own = await read($, actions)
  const isEmpty = own.buttons.length + own.groups.length + own.errors.length === 0
  return [
    m.buttons.file(home && actionsPath.startsWith(`${home}/`) ? `~${actionsPath.slice(home.length)}` : actionsPath),
    isEmpty ? m.buttons.none : m.buttons.counts(own.buttons.length, own.groups.length),
    ...own.errors.map(error => errorText(error, m)),
    ...crowdedScopes(mergeById(builtInButtons(m), own.buttons)).map(([scope, n]) => m.buttons.tooMany(n, m.buttons.scopes[scope])),
    m.buttons.how,
  ].join('\n')
}

// What a card's own buttons can fill in, by the key its hide and note use.
async function buttonCards($: EngineInterface): Promise<Map<string, Vars>> {
  return new Map<string, Vars>([
    ...(await read($, items)).map(i => [itemKey(i), { RepoName: i.repo, PrNumber: `${i.number}`, PrUrl: i.url, PrTitle: i.title, Author: i.author }] as const),
    ...(await read($, mine)).map(
      pr => [prHideKey(pr), { RepoName: pr.repo, PrNumber: `${pr.number}`, PrUrl: pr.url, PrTitle: pr.title, HeadRefName: pr.branch, BaseRefName: pr.base }] as const,
    ),
    ...(await read($, issues)).map(i => [issueHideKey(i), { RepoName: i.repo, IssueNumber: `${i.number}`, IssueTitle: i.title, IssueUrl: i.url }] as const),
  ])
}

// One line per press of a card's own button, in the order pressed.
async function buttonPrompts($: EngineInterface, keys: string[]): Promise<string> {
  const buttons = mergeById(builtInButtons(m), (await read($, actions)).buttons)
  const cards = await buttonCards($)
  let text = ''
  for (const key of keys) {
    const at = key.lastIndexOf('::')
    const vars = at > 0 ? cards.get(key.slice(0, at)) : undefined
    const id = key.slice(at + 2)
    const button = id === MERGE ? { prompt: m.direct.mergePrompt } : buttons.find(b => b.id === id)
    if (!vars || !button) continue
    const place = await placeFor($, vars.RepoName ?? '')
    const repoPath = place.kind === 'folder' ? place.path : place.kind === 'here' ? await $.session.cwd() : ''
    text += `${fillTemplate(button.prompt, { ...vars, RepoPath: repoPath })}\n`
  }
  return text
}

// False only when a dialog holds the keys: that passes, so the drawer stays open with its picks and the next close tries again.
async function fillAdded($: EngineInterface): Promise<boolean> {
  const byKey = new Map((await pickable($)).map(c => [c.key, c]))
  const keys = await read($, added)
  const chosen = keys.flatMap(key => byKey.get(key) ?? [])
  if (keys.length > 0) {
    const { text } = await $.prompt.read()
    const style = learnedStyle(await readJson($, styleFile(), {} as StyleFile))
    const jobs = (await read($, autoReview)).jobs
    const reviewsOn = chosen.flatMap(c => c.review ?? [])
    const pending: Record<string, PendingReview> = {}
    for (const i of reviewsOn) {
      const job = jobs[itemKey(i)]
      if (job?.headSha === i.headSha && job.reviewId) pending[itemKey(i)] = { id: job.reviewId, where: workWhere(await placeFor($, i.repo), i.repo, true, m) }
    }
    const reviews = reviewPrompts(text, reviewsOn, m, style, pending)
    const tasks = await Promise.all(chosen.flatMap(c => c.task ?? []).map(async task => ({ task, place: await placeFor($, task.repo) })))
    const queued = reviews + taskPrompts(text + reviews, tasks, m)
    const own = await buttonPrompts($, keys)
    const before = text + queued
    const all = queued + (own && before !== '' && !before.endsWith('\n') ? `\n${own}` : own)
    const filled = all ? await $.prompt.fill({ text: all, mode: 'append' }) : undefined
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
  const away = (key: string, test: (hideMap: Record<string, string>) => boolean) => test(hiddenMap) || isSnoozed(notesMap[key], key, now, test)
  return {
    review: (i: InboxItem) => away(itemKey(i), hideMap => isHidden(hideMap, i)),
    pr: (pr: MyPr) => away(prHideKey(pr), hideMap => isPrHidden(hideMap, pr)),
    issue: (i: IssueItem) => away(issueHideKey(i), hideMap => isIssueHidden(hideMap, i)),
  }
}

async function liveKeys($: EngineInterface) {
  return new Set([
    ...(await read($, items)).map(itemKey),
    ...(await read($, mine)).map(prHideKey),
    ...(await read($, issues)).map(issueHideKey),
    ...(await read($, activity)).threads.map(threadKey),
  ])
}

// Read-modify-write on its own file, like a hide.
async function setNotes($: EngineInterface, change: (n: Record<string, Note>) => Record<string, Note>) {
  const current = await readJson($, notesFile(), {} as Record<string, Note>)
  if (current === undefined) {
    $.ui.toast(m.toast.retry)
    return
  }
  const next = keptNotes(change(current), await liveKeys($), Date.now())
  await writeJson($, notesFile(), next)
  await update($, notes, () => next)
  await flashDrops($)
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

// Reloads this session once when a newer release asks; the command waits until the session is idle.
async function answerReload($: EngineInterface) {
  const request = await readJson($, RELOAD_FILE, undefined as ReloadRequest | undefined)
  if (!request || !shouldReload(request, version, loadedAt)) return
  // Answered, even if the reload is refused or another session's clock runs ahead.
  loadedAt = Math.max(Date.now(), request.at)
  await $.command.run({ command: 'reload-plugins' })
}

// Tells the other sessions what this one is on, and reads what they are on.
// shortcut: two sessions writing in the same instant can drop one entry until its next check-in, 30 seconds on; lock the file if that shows
async function checkIn($: EngineInterface, leaving = false) {
  const file = await readJson($, SESSIONS_FILE, {} as Record<string, Presence>)
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
    next = { ...others, [selfId]: { at: Date.now(), folder, remotes, prs, ...(branch ? { branch } : {}), ...(version ? { version } : {}) } }
    await rememberFolder($, remotes, () => git(['rev-parse', '--path-format=absolute', '--git-common-dir']))
  }
  await writeJson($, SESSIONS_FILE, next)
  await update($, sessions, () => next)
}

// Remembers which folder holds each of this session's repositories, so a card in another session can name it.
// shortcut: a folder moved or deleted is dropped only when a card's fill finds it gone; prune the file if it grows stale
async function rememberFolder($: EngineInterface, remotes: string[], commonDir: () => Promise<string>) {
  const file = await readJson($, REPOS_FILE, {} as RepoPaths)
  if (file === undefined) return
  home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
  const top = remotes.length > 0 ? mainCheckout(await commonDir(), home) : undefined
  // Written only when a folder changes, not at every check-in.
  const next = top !== undefined && remotes.some(repo => file[repo]?.path !== top) ? remember(file, remotes, top, Date.now()) : file
  if (next !== file) await writeJson($, REPOS_FILE, next)
  await update($, repos, () => next)
}

// Read-modify-write on its own file, so a hide never races a fetch rewriting the inbox.
async function setHidden($: EngineInterface, change: (hideMap: Record<string, string>) => Record<string, string>) {
  const current = await readJson($, hiddenFile(), {} as Record<string, string>)
  if (current === undefined) {
    $.ui.toast(m.toast.retry)
    return
  }
  const live = await liveKeys($)
  const next = Object.fromEntries(Object.entries(change(current)).filter(([key]) => live.has(key)))
  await writeJson($, hiddenFile(), next)
  await update($, hidden, () => next)
  await flashDrops($)
}

export const register: Register = (on, options) => {
  const opts = options as Options
  languageOption = opts.language
  const minutes = Number(opts.refreshMinutes)
  config = {
    scope: (opts.scope ?? '').trim(),
    githubUser: (opts.githubUser ?? '').trim(),
    language: 'en',
    refreshMs: (Number.isFinite(minutes) && minutes >= 5 ? minutes : 10) * 60_000,
    repoPaths: parseRepoPaths(opts.repoPaths ?? ''),
    motion: opts.motion === 'off' ? 'off' : 'auto',
    directActions: opts.directActions === 'on',
    auto: { isOn: opts.autoReview === 'on', daily: parseDaily(opts.autoReviewDaily) },
    autoModel: opts.autoReviewModel === 'opus' ? 'opus' : 'sonnet',
    autoSkills: parseSkills(opts.autoReviewSkills),
  }
  m = MESSAGES.en

  on('session.start', async ($, e, next) => {
    // Before anything is drawn or fetched: the language decides the strings and which shared file is read.
    config.language = await resolveLanguage($)
    m = MESSAGES[config.language]
    home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
    ghRepo = await $.env.get('GH_REPO')
    await loadActions($).catch(() => undefined)
    // A pane a reload kept open was not opened through openDrawer.
    await loadSeen($).catch(() => undefined)
    isStill =
      config.motion === 'off' || (await $.settings.read({ key: 'prefersReducedMotion' }).then(v => v === true, () => false))
    await syncEnabled($).catch(() => undefined)
    // A reload keeps an open pane, its title and the last drawing; bring them to the language just resolved.
    const pane = (await $.ui.panes()).find(p => p.id === PANE)
    if (pane && pane.title !== m.title) await $.ui.open({ id: PANE, title: m.title, closeOnEscape: true })
    $.ui.invalidate('ui.render')
    await $.command.register({ name: 'review-inbox', description: m.command.description, argumentHint: '[buttons | add-button | add-search]' })
    // Spread sessions opened together so they do not all find the file stale in the same second.
    $.clock.after(1_000 + Math.floor(Math.random() * 4_000), () => void sync($))
    $.clock.every(SYNC_MS, () => void sync($))
    if (config.auto.isOn) $.clock.every(SYNC_MS, () => void tickAuto($).catch(() => undefined))
    selfId = await $.session.id()
    loadedAt = Date.now()
    version = await $.fs
      .read(`${$.plugin.root}/.claude-plugin/plugin.json`)
      .then(text => (JSON.parse(text) as { version?: string }).version)
      .catch(() => undefined)
    $.clock.after(1_000, () => void checkIn($).catch(() => undefined))
    $.clock.every(SYNC_MS, () => void checkIn($).catch(() => undefined))
    $.clock.every(SYNC_MS, () => void answerReload($).catch(() => undefined))
    $.clock.every(1_000, () => {
      if (!wanted) return
      const force = wanted === 'fetch'
      wanted = undefined
      void sync($, force)
    })
    return next(e)
  })

  // The reviewer is the mod's alone: a type the model could see would add a line to every request of the session.
  on('agent.offer', { agent: AGENT_TYPE }, async () => ({ isOffered: false }))

  // A review's answer arrives as its subagent's last turn; the main loop's turns carry no agentId.
  on('turn.complete', async ($, e, next) => {
    if (config.auto.isOn && e.agentId) {
      const tokens = e.usage ? tokensOf(e.usage) : undefined
      await finishRun($, e.agentId, e.answer, tokens, e.isAborted).catch(() => undefined)
    }
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
    const sub = e.args.trim()
    if (sub === 'buttons') return { text: await buttonsReport($) }
    if (sub === 'add-button' || sub === 'add-search') {
      await loadActions($)
      const text = sub === 'add-button' ? m.prompt.addButton(actionsPath, VARIABLES.join(', ')) : m.prompt.addGroup(actionsPath)
      const filled = await $.prompt.fill({ text, mode: 'append' })
      return { text: filled.isFilled ? m.command.filled : m.toast.promptBusy }
    }
    terminalColumns = e.presentation.columns
    await openDrawer($)
    wanted ??= 'sync'
    return { text: m.command.opened }
  })

  // Fill before the drawer goes, so a fill a dialog refuses keeps it open; answering without next keeps a pane.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'unload') return next(e)
    await Promise.all(Object.keys(await read($, settling)).map(id => settle($, id)))
    await update($, confirming, () => null)
    const isFilled = await fillAdded($).catch(() => {
      $.ui.toast(m.toast.retry)
      return true
    })
    if (!isFilled) return { value: undefined }
    await writeJson($, seenFile(), { at: Date.now() }).catch(() => undefined)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.viewport) terminalColumns = e.viewport.columns
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const away = awayTests(await read($, hidden), await read($, notes), Date.now())
    const reviews = (await read($, items)).filter(i => !i.isDraft && !away.review(i))
    const band = await bandNow($)
    const counts = bandLabels(band, m, await read($, capped))
    if (counts.length === 0) return below
    // bandLabels keeps this order and leaves out the same zeros.
    const keys = BAND_KEYS.filter(k => band[k] > 0)
    const flashing = await read($, dropped)
    // Finished reviews waiting for my verdict, among the cards the band counts.
    const finished = config.auto.isOn ? Object.values(autoStates(await read($, autoReview), reviews, config.auto, Date.now())).filter(s => s.kind === 'done').length : 0

    const { Box, Text, Button } = $.ui.resolve(e)
    const now = Date.now()
    const oldest = reviews.length > 0 ? Math.max(...reviews.map(i => waitingDays(i.requestedAt, now))) : undefined

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row">
            <Text color={oldest === undefined ? 'subtle' : ageColor(oldest)}>▌ </Text>
            <Text bold>
              {counts.map((label, i) => (
                <Text key={keys[i]} color={flashing.includes(keys[i]!) ? 'success' : undefined}>
                  {i > 0 ? ' · ' : ''}
                  {label}
                </Text>
              ))}
            </Text>
            {finished > 0 && <Text color="suggestion">{m.band.autoDone(finished)}</Text>}
            {oldest !== undefined && <Text dimColor>{m.band.oldest(oldest)}</Text>}
          </Box>
          <Button key="open" label={m.band.open} variant="primary" onPress={() => void openDrawer($)} />
        </Box>
        {below}
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
    const state = await read($, status)
    const active = await read($, tab)
    const allPrs = await read($, mine)
    const allIssues = await read($, issues)
    const live = liveSessions(await read($, sessions), now)
    const older = olderSessions(live, selfId, version)
    const asked = version !== undefined && (await read($, reloadAsked)) === version
    // This session's repositories come first in every group; the scope buttons narrow the tabs to them.
    const here = thisRepos(live[selfId], ghRepo)
    const shownReviews = hereFirst(everything.filter(i => !away.review(i)), here)
    const shownPrs = hereFirst(allPrs.filter(pr => !away.pr(pr)), here)
    const shownIssues = hereFirst(allIssues.filter(i => !away.issue(i)), here)
    const allShown = [...shownReviews, ...shownPrs, ...shownIssues]
    const isMixed = allShown.some(c => isHere(c.repo, here)) && !allShown.every(c => isHere(c.repo, here))
    const narrow = isMixed && (await read($, onlyHere))
    const scoped = <T extends { repo: string }>(cards: T[]) => (narrow ? cards.filter(c => isHere(c.repo, here)) : cards)
    const list = scoped(shownReviews)
    const ready = list.filter(i => !i.isDraft)
    const drafts = list.filter(i => i.isDraft)
    const myPrs = scoped(shownPrs)
    const myIssues = scoped(shownIssues)
    const cappedTabs = await read($, capped)
    const shut = await read($, collapsed)
    const addedKeys = [...(await read($, added)), ...(await read($, requested))]
    const where = (pr: { repo: string; url: string; branch?: string }) =>
      workingOn(live, pr).map(id => (id === selfId ? m.session.here : live[id]!.folder))
    const sessionLine = (pr: { repo: string; url: string; branch?: string }) => {
      const names = where(pr)
      return names.length > 0 && <Text color="suggestion">{m.session.at(names.join(', '))}</Text>
    }
    const repoPaths = await read($, repos)
    // Where the card's task would be worked on, beside its button; whether the folder still exists is checked at the fill.
    const taskRow = (card: MyPr | IssueItem, key: string) => {
      const kind = taskOf(card)
      if (!kind) return undefined
      const place = placeOf(card.repo, live[selfId], repoPaths, mappedPath(card.repo, config.repoPaths, home))
      const hint =
        place.kind === 'here'
          ? m.card.here
          : place.kind === 'folder'
            ? m.card.at(home && place.path.startsWith(`${home}/`) ? `~${place.path.slice(home.length)}` : place.path)
            : m.card.noClone
      const isAdded = addedKeys.includes(key)
      return (
        <Box flexDirection="row" justifyContent="space-between" gap={1}>
          <Box flexShrink={1}>
            <Text dimColor wrap="truncate-end">
              {hint}
            </Text>
          </Box>
          <Button
            key={`task-${card.url}`}
            label={isAdded ? m.card.added : m.card.task[kind]}
            {...(isAdded ? { dimColor: true } : { variant: 'primary' as const })}
            onPress={() => void addCard($, key)}
          />
        </Box>
      )
    }

    const own = await read($, actions)
    const buttons = mergeById(builtInButtons(m), own.buttons)
    const { groups, extra: extraGroups } = searchGroups(m, own.groups)
    const results = await read($, groupResults)
    const notified = await read($, activity)
    const pendingThreads = await read($, settling)
    const settleFailures = await read($, settleErrors)
    const hiddenMap = await read($, hidden)
    const cardUrls = new Set([...everything, ...allPrs, ...allIssues].map(c => c.url))
    const threads = shownThreads(notified.threads, cardUrls).filter(t => !isThreadHidden(hiddenMap, t))
    const openThreads = threads.filter(t => !pendingThreads[t.id])
    const moreKey = await read($, more)
    const seen = await read($, seenAt)
    // Updated since the drawer was last closed, as GitHub's inbox marks what changed since my last visit.
    const newDot = (updatedAt: string | undefined) =>
      seen > 0 && updatedAt !== undefined && Date.parse(updatedAt) > seen && <Text color="suggestion">● </Text>
    const asking = await read($, confirming)
    const directResults = await read($, directs)
    // A card's writes to GitHub, its confirm row in their place while one is asked; `extra` is the Merge button, which the setting does not hide.
    const directRow = (key: string, target: DirectTarget, offered: DirectAction[], extra?: RenderChildren, suggested?: DirectAction) => {
      if (asking?.key === key && needsConfirm(asking.action)) {
        const action = asking.action
        return (
          <Box flexDirection="column">
            <Text color="warning">{m.direct.ask[action](`${target.repo}#${target.number} "${target.title}"`, asking.login || '…')}</Text>
            <Box flexDirection="row" justifyContent="flex-end" gap={1}>
              <Button key={`direct-cancel-${key}`} label={m.direct.cancel} onPress={() => void update($, confirming, () => null)} />
              <Button key={`direct-confirm-${key}`} label={m.direct.confirm[action]} variant="primary" hotkey="y" onPress={() => void confirmDirect($)} />
            </Box>
          </Box>
        )
      }
      const result = directResults[key]
      // Auto review is its own switch: its post and discard buttons show without Direct GitHub actions.
      const shownActions = offered.filter(a => (config.directActions || isAutoAction(a)) && !(result?.action === a && result.phase !== 'failed'))
      if (!result && shownActions.length === 0 && !extra) return undefined
      return (
        <Box flexDirection="row" justifyContent="space-between" gap={1}>
          <Box flexShrink={1}>
            {result?.phase === 'sending' && <Text dimColor>{m.direct.sending}</Text>}
            {result?.phase === 'done' && <Text color="success">✓ {m.direct.done[result.action]}</Text>}
            {result?.phase === 'failed' && <Text color="warning">{result.message}</Text>}
          </Box>
          <Box flexDirection="row" gap={1} flexShrink={0}>
            {extra}
            {result?.undo && <Button key={`direct-undo-${key}`} label={m.activity.undo} onPress={() => void undoAssign($, key, target)} />}
            {shownActions.map(a => (
              <Button
                key={`direct-${a}-${key}`}
                label={m.direct.label[a]}
                {...(a === suggested ? { variant: 'primary' as const } : {})}
                onPress={() => void pressDirect($, key, a, target)}
              />
            ))}
          </Box>
        </Box>
      )
    }
    const mergeButton = (key: string) => {
      const isAdded = addedKeys.includes(buttonKey(key, MERGE))
      return (
        <Button
          key={`merge-${key}`}
          label={isAdded ? m.card.added : m.direct.merge}
          {...(isAdded ? { dimColor: true } : { variant: 'primary' as const })}
          onPress={() => void addCard($, buttonKey(key, MERGE))}
        />
      )
    }
    const moreButton = (key: string) => (
      <Button
        key={`more-${key}`}
        label={`${moreKey === key ? '▾' : '▸'} ${m.buttons.more}`}
        dimColor
        onPress={() => void update($, more, open => (open === key ? '' : key))}
      />
    )
    // One card's row at a time, like the note editor; Note and Hide come first, as they are on every card.
    const moreRow = (key: string, scope: ButtonScope, hide: RenderChildren) =>
      moreKey === key && (
        <Box flexDirection="row" flexWrap="wrap" gap={1} marginTop={1}>
          {noteButton(key)}
          {hide}
          {buttons
            .filter(b => b.scope === scope)
            .map(b => {
              const isAdded = addedKeys.includes(buttonKey(key, b.id))
              return (
                <Button
                  key={`btn-${key}-${b.id}`}
                  label={isAdded ? m.card.added : b.name}
                  {...(isAdded ? { dimColor: true } : {})}
                  onPress={() => void addCard($, buttonKey(key, b.id))}
                />
              )
            })}
        </Box>
      )
    // Settings live in /review-inbox buttons; the drawer speaks up only when actions.json needs fixing.
    const crowded = crowdedScopes(buttons)

    // Only when the tabs mix repositories; on every card it would say nothing.
    const hereTag = (repo: string) => isMixed && isHere(repo, here) && <Text dimColor> · {m.card.thisRepo}</Text>
    const detailsLine = (card: Parameters<typeof detailsText>[0]) => {
      const text = detailsText(card, m)
      return (
        text && (
          <Text dimColor wrap="truncate-end">
            {text}
          </Text>
        )
      )
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

    const autoMap = autoStates(await read($, autoReview), everything, config.auto, now)
    // Where the card stands in auto review; nothing when it is off or the card is not one it reviews.
    const autoLine = (item: InboxItem) => {
      const key = itemKey(item)
      const s = autoMap[key]
      if (!s) return undefined
      if (s.kind === 'done' && s.result) {
        const { result } = s
        const counts = severityCounts(result.findings).map(c => `${c.count} ${m.auto.severities[c.severity]}`)
        const head = [m.auto.suggests(m.auto.verdicts[result.verdict]), counts.length > 0 ? counts.join(', ') : m.auto.noFindings, s.tokens ? m.auto.tokens(Math.round(s.tokens / 1000)) : '']
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color="suggestion">{head.filter(Boolean).join(' · ')}</Text>
            {s.carriedFrom && <Text dimColor>{m.auto.carried(s.carriedFrom.slice(0, 7))}</Text>}
            {bySeverity(result.findings)
              .slice(0, 3)
              .map((f, i) => (
                <Text key={`auto-finding-${key}-${i}`} dimColor wrap="truncate-end">
                  {m.auto.severities[f.severity]} · {f.path}:{f.line} · {f.body}
                </Text>
              ))}
          </Box>
        )
      }
      const text =
        s.kind === 'manual'
          ? s.why === 'before'
            ? m.auto.before
            : m.auto.tooBig
          : s.kind === 'settling'
            ? m.auto.settling(Math.max(1, Math.ceil((s.startsAt - now) / 60_000)))
            : s.kind === 'capped'
              ? m.auto.capped
              : s.kind === 'running'
                ? m.auto.running(Math.max(0, Math.floor((now - s.since) / 60_000)))
                : s.kind === 'done'
                  ? s.reviewId
                    ? m.auto.pending
                    : m.auto.reviewed
                  : s.kind === 'failed'
                    ? m.auto.failed(s.error)
                    : s.kind === 'stale'
                      ? m.auto.stale(s.from.slice(0, 7))
                      : m.auto.queued(s.ahead)
      return (
        <Box flexDirection="row" justifyContent="space-between" gap={1} marginTop={1}>
          <Box flexShrink={1}>
            <Text color={s.kind === 'failed' || s.kind === 'stale' ? 'warning' : 'suggestion'}>{text}</Text>
          </Box>
          {(s.kind === 'manual' || s.kind === 'failed') && (
            <Button key={`auto-run-${key}`} label={s.kind === 'failed' ? m.auto.retry : m.auto.run} onPress={() => void runAuto($, key)} />
          )}
        </Box>
      )
    }
    // A finished auto review replaces Approve: GitHub takes no other review while mine is pending.
    const reviewRow = (item: InboxItem) => {
      const key = itemKey(item)
      const s = autoMap[key]
      const target = { repo: item.repo, number: item.number, title: item.title, sha: item.headSha }
      const open = <Link key={`auto-open-${key}`} href={`${item.url}/files`}>{m.auto.open} ↗</Link>
      if (s?.kind === 'stale') return directRow(key, { ...target, reviewId: s.reviewId }, STALE_ACTIONS, open)
      if (s?.kind !== 'done' || !s.reviewId) return directRow(key, target, reviewActions(item))
      const suggested = s.result ? (`post-${s.result.verdict === 'request-changes' ? 'changes' : s.result.verdict}` as const) : undefined
      return directRow(key, { ...target, reviewId: s.reviewId }, AUTO_ACTIONS, open, suggested)
    }
    const card = (item: InboxItem) => {
      const days = waitingDays(item.requestedAt, now)
      const isAdded = addedKeys.includes(itemKey(item))
      // With my pending review on the PR, the request works on that review rather than starting one.
      const auto = autoMap[itemKey(item)]
      const isPending = auto?.kind === 'done' && !!auto.reviewId
      return (
        <Box key={`card-${item.repo}-${item.number}`} flexDirection="row" marginBottom={1}>
          <Box width={1} flexShrink={0} backgroundColor={item.isDraft ? 'inactive' : ageColor(days)} />
          <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
            <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap" columnGap={1}>
              <Text bold>
                {newDot(item.updatedAt)}
                {item.repo} #{item.number}
                {hereTag(item.repo)}
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
            {detailsLine(item)}
            {autoLine(item)}

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

            <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap" columnGap={1} marginTop={1}>
              <Text dimColor>
                {item.author} · {m.card.size(item.files, item.additions.toLocaleString(), item.deletions.toLocaleString())}
              </Text>
              <Box flexDirection="row" gap={1} flexShrink={0}>
                {moreButton(itemKey(item))}
                <Button
                  key={`review-${itemKey(item)}`}
                  label={isAdded ? m.card.added : isPending ? m.auto.refine : m.card.review}
                  {...(isAdded ? { dimColor: true } : { variant: 'primary' as const })}
                  onPress={() => void addCard($, itemKey(item))}
                />
              </Box>
            </Box>
            {reviewRow(item)}
            {moreRow(
              itemKey(item),
              'review',
              <Button
                key={`hide-${item.repo}-${item.number}`}
                label={m.card.hide}
                dimColor
                onPress={() => void setHidden($, hideMap => ({ ...hideMap, [itemKey(item)]: item.headSha }))}
              />,
            )}
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
          <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap" columnGap={1}>
            <Text bold>
              {newDot(pr.updatedAt)}
              {pr.repo} #{pr.number}
              {hereTag(pr.repo)}
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
          {titleRow(pr.url, pr.title, moreButton(prHideKey(pr)))}
          {detailsLine(pr)}
          {pr.newReviews.length > 0 && (
            <Text color="suggestion" wrap="truncate-end">
              {m.card.newReview(reviewers(pr))}
            </Text>
          )}
          {taskRow(pr, prHideKey(pr))}
          {directRow(
            prHideKey(pr),
            { repo: pr.repo, number: pr.number, title: pr.title, sha: pr.headSha },
            prActions(pr),
            canMerge(pr) && mergeButton(prHideKey(pr)),
          )}
          {moreRow(
            prHideKey(pr),
            'pr',
            <Button
              key={`hide-${pr.url}`}
              label={m.card.hide}
              dimColor
              onPress={() => void setHidden($, hideMap => ({ ...hideMap, ...Object.fromEntries([prHide(pr, Date.now())]) }))}
            />,
          )}
          {noteEditor(prHideKey(pr), () => prHide(pr, Date.now())[1])}
        </Box>
      </Box>
    )

    const issueCard = (issue: IssueItem) => (
      <Box key={`issue-${issueKey(issue)}`} flexDirection="row" marginBottom={1}>
        <Box width={1} flexShrink={0} backgroundColor={issue.kind === 'reference' ? 'inactive' : 'suggestion'} />
        <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
          <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap" columnGap={1}>
            <Text bold>
              {newDot(issue.at)}
              {issue.repo} #{issue.number}
              {hereTag(issue.repo)}
            </Text>
            <Text dimColor>
              {m.issueKind[issue.kind]} · {m.card.ago(waitingDays(issue.at, now))}
            </Text>
          </Box>
          {noteLine(issueHideKey(issue))}
          {titleRow(issue.url, issue.title, moreButton(issueHideKey(issue)))}
          {detailsLine(issue)}
          {issue.kind === 'reference' && (
            <Text dimColor>
              {m.card.referenced(issue.by ?? '', issue.target ?? '')}
            </Text>
          )}
          {taskRow(issue, issueHideKey(issue))}
          {directRow(issueHideKey(issue), { repo: issue.repo, number: issue.number, title: issue.title }, issueActions(issue))}
          {moreRow(
            issueHideKey(issue),
            'issue',
            <Button
              key={`hide-${issueKey(issue)}`}
              label={m.card.hide}
              dimColor
              onPress={() => void setHidden($, hideMap => ({ ...hideMap, ...Object.fromEntries([issueHide(issue)]) }))}
            />,
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
    const band = bandCounts(shownReviews.filter(i => !i.isDraft).length, shownPrs, shownIssues, bandSearchCount(groups, results))
    const isZero = state.kind === 'ready' && state.updatedAt !== undefined && BAND_KEYS.every(k => band[k] === 0)
    const tabCards: { repo: string }[] = active === 'review' ? shownReviews : active === 'mine' ? shownPrs : shownIssues
    const tabs: { id: Tab; label: string }[] = [
      { id: 'review', label: m.tabs.review(atLeast(ready.length, cappedTabs.review)) },
      { id: 'mine', label: m.tabs.mine(atLeast(myPrs.length, cappedTabs.mine)) },
      { id: 'issues', label: m.tabs.issues(atLeast(direct.length, cappedTabs.issues)) },
      { id: 'searches', label: m.tabs.searches },
      { id: 'activity', label: m.tabs.activity(`${openThreads.filter(t => t.unread).length}`) },
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
              await setHidden($, hideMap => Object.fromEntries(Object.entries(hideMap).filter(([k]) => !keys.includes(k))))
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
    const hitRow = (groupId: string, hit: GroupHit) => (
      <Box key={`hit-${groupId}-${hit.url}`} flexDirection="row" justifyContent="space-between" gap={1} marginBottom={1}>
        <Box flexShrink={1}>
          <Text wrap="truncate-end">
            <Text bold>
              {hit.repo} #{hit.number}
            </Text>{' '}
            <Link href={hit.url}>{hit.title} ↗</Link>
          </Text>
        </Box>
        <Text dimColor>
          {hit.author} · {m.card.ago(waitingDays(hit.updatedAt, now))}
        </Text>
      </Box>
    )
    const reasonText = (reason: string) => (m.activity.reasons as Record<string, string>)[reason] ?? reason.replace(/_/g, ' ')
    // A thread sent off shows its Undo in its place until the call goes.
    const threadRow = (t: Thread) => {
      const pending = pendingThreads[t.id]
      const failure = settleFailures[t.id]
      if (pending)
        return (
          <Box key={`thread-${t.id}`} flexDirection="row" gap={1} marginBottom={1}>
            <Text dimColor>
              {pending.kind === 'done' ? m.activity.wasDone : m.activity.wasUnsubscribed} · {t.repo}
            </Text>
            <Button key={`undo-${t.id}`} label={m.activity.undo} onPress={() => void update($, settling, s => without(s, t.id))} />
          </Box>
        )
      return (
        <Box key={`thread-${t.id}`} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap" columnGap={1}>
            <Text bold>
              {t.unread ? '● ' : ''}
              {t.repo}
            </Text>
            <Text dimColor>{m.card.ago(waitingDays(t.updatedAt, now))}</Text>
          </Box>
          {titleRow(t.url, t.title, [
            <Button key={`done-${t.id}`} label={m.activity.done} dimColor onPress={() => void settleLater($, t, 'done')} />,
            <Button key={`unsubscribe-${t.id}`} label={m.activity.unsubscribe} dimColor onPress={() => void settleLater($, t, 'unsubscribe')} />,
          ])}
          {failure !== undefined && <Text color="warning">{m.activity.failed(failure)}</Text>}
        </Box>
      )
    }
    // One folding section per group, shown even when empty so a group never seems lost.
    const groupSection = (group: SearchGroup) => {
      const id = `searches:${group.id}`
      const isShut = shut.includes(id)
      const result = resultOf(group, results)
      const note = (text: string, color?: 'warning') => (
        <Box marginBottom={1}>
          <Text dimColor={!color} color={color}>
            {text}
          </Text>
        </Box>
      )
      return (
        <Box key={`group-${group.id}`} flexDirection="column">
          <Box marginBottom={1}>
            <Button
              key={`fold-${id}`}
              label={`${isShut ? '▸' : '▾'} ${group.name} ${result ? result.count : '…'}`}
              dimColor
              onPress={() => void update($, collapsed, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))}
            />
          </Box>
          {!isShut &&
            (result === undefined
              ? note(m.status.loading)
              : result.error !== undefined
                ? note(m.searches.failed(result.error), 'warning')
                : result.hits.length === 0
                  ? note(m.searches.none)
                  : result.hits.map(hit => hitRow(group.id, hit)))}
          {!isShut && result && result.count > result.hits.length && (
            <Box marginBottom={1}>
              <Text>
                <Link href={searchUrl(group)}>{m.searches.more(result.count - result.hits.length)} ↗</Link>
              </Text>
            </Box>
          )}
        </Box>
      )
    }

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
        {older.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text color="warning">{m.status.older(older.length, [...new Set(older)].join(', '))}</Text>
            <Button
              key="reload-all"
              label={asked ? m.status.reloadAsked : m.status.reloadAll}
              dimColor
              onPress={async () => {
                await writeJson($, RELOAD_FILE, { version, at: Date.now() })
                await update($, reloadAsked, () => version ?? '')
              }}
            />
          </Box>
        )}
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
            {isZero && (
              <Box marginTop={1}>
                <Text color="success">{m.empty.zero}</Text>
              </Box>
            )}
            {isMixed && active !== 'searches' && active !== 'activity' && (
              <Box flexDirection="row" flexWrap="wrap" columnGap={1} marginTop={1}>
                {[
                  { id: 'here', isOn: narrow, label: m.sections.here(tabCards.filter(c => isHere(c.repo, here)).length) },
                  { id: 'all', isOn: !narrow, label: m.sections.all(tabCards.length) },
                ].map(s => (
                  <Button
                    key={`scope-${s.id}`}
                    label={s.label}
                    {...(s.isOn ? { variant: 'primary' as const } : { dimColor: true })}
                    onPress={() => void update($, onlyHere, () => s.id === 'here')}
                  />
                ))}
              </Box>
            )}
            <Box flexDirection="row" flexWrap="wrap" columnGap={1} marginY={1}>
              {tabs.map((t, i) => [
                // The lists to act on, then the ones to browse.
                i === 3 && (
                  <Text key="tab-divider" dimColor>
                    │
                  </Text>
                ),
                <Button
                  key={`tab-${t.id}`}
                  label={t.label}
                  hotkey={`${i + 1}`}
                  {...(t.id === active ? { variant: 'primary' as const } : { dimColor: true })}
                  onPress={() => void update($, tab, () => t.id)}
                />,
              ])}
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

            {active === 'searches' && (
              <Box flexDirection="column">
                {groups.length === 0 && empty(m.empty.searches)}
                {groups.map(groupSection)}
                {extraGroups > 0 && <Text color="warning">{m.searches.tooMany(extraGroups)}</Text>}
              </Box>
            )}

            {active === 'activity' && (
              <Box flexDirection="column">
                {notified.noAccess && <Text color="warning">{m.activity.noAccess}</Text>}
                {notified.error !== undefined && <Text color="warning">{m.status.error(notified.error)}</Text>}
                {!notified.noAccess && threads.length === 0 && empty(m.empty.activity)}
                {byReason(threads).map(([reason, list]) => section(`activity:${reason}`, `${reasonText(reason)} ${list.length}`, list, threadRow))}
              </Box>
            )}

            {own.errors.length + crowded.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                {own.errors.map(error => (
                  <Text key={`button-error-${error.at}`} color="warning">
                    {errorText(error, m)}
                  </Text>
                ))}
                {crowded.map(([scope, n]) => (
                  <Text key={`crowded-${scope}`} color="warning">
                    {m.buttons.tooMany(n, m.buttons.scopes[scope])}
                  </Text>
                ))}
                <Text dimColor>{m.buttons.hint}</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  })
}

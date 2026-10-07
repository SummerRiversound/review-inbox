import type { Impact, InboxFile, InboxItem } from '../types'
import { MESSAGES } from './i18n'
import type { Language, Messages } from './i18n'

export type SearchHit = {
  repository: { nameWithOwner: string }
  number: number
  title: string
  url: string
  author: { login: string } | null
  createdAt: string
  isDraft: boolean
}

export type PrDetail = {
  headRefOid: string
  body: string
  additions: number
  deletions: number
  changedFiles: number
  reviewRequests: { login?: string; name?: string; slug?: string }[]
  files?: { path: string }[]
  reviews?: { state?: string; author: { login: string } | null; commit?: { oid: string } | null }[]
}

type Reviewer = { login?: string; name?: string; slug?: string } | null

// One GraphQL search returns every PR with what the cards need, so one PR can't fail the rest.
export type GqlPr = SearchHit & {
  body: string
  additions: number
  deletions: number
  changedFiles: number
  headRefOid: string
  files: { nodes: { path: string }[] } | null
  reviewRequests: { nodes: { requestedReviewer: Reviewer }[] }
  reviews: { nodes: { state?: string; author: { login: string } | null; commit: { oid: string } | null }[] }
  timelineItems: { nodes: { createdAt?: string; requestedReviewer?: Reviewer }[] }
}

export const INBOX_QUERY = `query($q: String!) {
  viewer { login }
  search(query: $q, type: ISSUE, first: 100) {
    nodes {
      ... on PullRequest {
        number title url isDraft createdAt body additions deletions changedFiles headRefOid
        author { login }
        repository { nameWithOwner }
        files(first: 80) { nodes { path } }
        reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } ... on Team { name slug } } } }
        reviews(last: 50) { nodes { state author { login } commit { oid } } }
        timelineItems(itemTypes: [REVIEW_REQUESTED_EVENT], last: 50) {
          nodes { ... on ReviewRequestedEvent { createdAt requestedReviewer { ... on User { login } ... on Team { slug } } } }
        }
      }
    }
  }
}`

// The user's scope narrows the base query; empty means every PR on GitHub that asks for my review.
export function searchQuery(scope: string): string {
  return ['is:pr is:open review-requested:@me', scope.trim()].filter(Boolean).join(' ')
}

// A short, filename-safe digest (FNV-1a) of what decides the inbox's contents.
export function cacheKey(...parts: string[]): string {
  let hash = 0x811c9dc5
  for (const ch of parts.join('\n')) {
    hash ^= ch.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function toDetail(pr: GqlPr): PrDetail {
  return {
    headRefOid: pr.headRefOid,
    body: pr.body,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    reviewRequests: pr.reviewRequests.nodes.map(n => n.requestedReviewer ?? {}),
    files: pr.files?.nodes ?? [],
    reviews: pr.reviews.nodes,
  }
}

// The latest time my review was asked for, directly or through a team still on the PR.
export function requestedAt(pr: GqlPr, me: string): string {
  const mine = (r: Reviewer | undefined) =>
    r?.login?.toLowerCase() === me.toLowerCase() ||
    (r?.slug !== undefined && pr.reviewRequests.nodes.some(n => n.requestedReviewer?.slug === r.slug))
  const times = pr.timelineItems.nodes.filter(n => n.createdAt && mine(n.requestedReviewer)).map(n => n.createdAt!)
  return times.sort().at(-1) ?? pr.createdAt
}

export type Summary = { summary: string; why: string; impact: Impact[]; summaryFailed?: number }

const DAY_MS = 86_400_000
export const REFRESH_MS = 10 * 60_000
export const RETRY_MS = 60_000
// A claim not renewed for this long belongs to a session that died mid-fetch.
export const CLAIM_MS = 3 * 60_000
const MAX_SUMMARY_TRIES = 3

export function waitingDays(since: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(since)) / DAY_MS))
}

export function ageColor(days: number): 'error' | 'warning' | 'subtle' {
  return days >= 14 ? 'error' : days >= 3 ? 'warning' : 'subtle'
}

// The team my review was asked of; undefined when it was asked of me directly, which wins when both were.
export function requestedTeam(requests: PrDetail['reviewRequests'], me: string): string | undefined {
  if (requests.some(r => r.login?.toLowerCase() === me.toLowerCase())) return undefined
  const team = requests.find(r => r.login === undefined && (r.name || r.slug))
  return team ? (team.name ?? team.slug) : undefined
}

export function sortItems(items: InboxItem[]): InboxItem[] {
  const isDirect = (i: InboxItem) => (i.team === undefined ? 0 : 1)
  return [...items].sort(
    (a, b) => isDirect(a) - isDirect(b) || Date.parse(a.requestedAt) - Date.parse(b.requestedAt),
  )
}

export function shouldFetch(file: InboxFile, now: number, force: boolean): boolean {
  if (file.fetchingSince !== undefined && now - file.fetchingSince < CLAIM_MS) return false
  if (force || file.fetchedAt === undefined) return true
  if (file.retryAt !== undefined) return now >= file.retryAt
  // A file written by an older version of the mod has no tabs; refresh it rather than show them empty.
  return file.mine === undefined || now - file.fetchedAt >= REFRESH_MS
}

// Summaries are tied to the head commit, so an unchanged PR keeps its own; a failed one is retried a few times, then kept.
export function reusableSummary(prev: InboxItem | undefined, headSha: string): Summary | undefined {
  if (!prev || prev.headSha !== headSha) return undefined
  if (prev.summaryFailed !== undefined && prev.summaryFailed < MAX_SUMMARY_TRIES) return undefined
  return {
    summary: prev.summary,
    why: prev.why,
    impact: prev.impact,
    ...(prev.summaryFailed !== undefined ? { summaryFailed: prev.summaryFailed } : {}),
  }
}

export function failedSummary(
  title: string,
  reason: string,
  prev: InboxItem | undefined,
  headSha: string,
  m: Messages,
): Summary {
  const tries = prev?.headSha === headSha ? (prev.summaryFailed ?? 0) : 0
  return { summary: title, why: m.summaryFailed(reason), impact: [], summaryFailed: tries + 1 }
}

export function summaryRules(language: Language): string {
  const l = MESSAGES[language].model
  return `You summarize a GitHub pull request for a reviewer who has not opened it yet.
${l.language}

Return only JSON: {"summary": string, "why": string, "impact": [{"text": string, "warn": boolean}]}
- summary: one sentence. What changes for users or teammates, not how the code changes.
- why: one or two sentences. The problem that exists without this PR.
- impact: one to three items. Which screens, APIs, data or services this touches, and whether existing behaviour stays the same.
  Set warn true only for: hard to roll back (DB schema, data migration), a required deploy or merge order, another service affected, permission or security changes.
- ${l.sentence}
- No function names, file paths, class names, internal acronyms or issue numbers. Say what a thing does instead.
- ${l.filler}

Example of a bad summary: "${l.bad}"
Example of a good summary: "${l.good}"`
}

export function summaryPrompt(hit: SearchHit, detail: PrDetail): string {
  const files = (detail.files ?? []).slice(0, 80).map(f => f.path).join('\n')
  return [
    `Repository: ${hit.repository.nameWithOwner}`,
    `Title: ${hit.title}`,
    `Size: ${detail.changedFiles} files, +${detail.additions} / -${detail.deletions}`,
    `Changed files:\n${files}`,
    `Description:\n${(detail.body ?? '').slice(0, 12_000) || '(empty)'}`,
  ].join('\n\n')
}

export function parseSummary(text: string): Summary | undefined {
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return undefined
  try {
    const raw = JSON.parse(json) as Partial<Summary>
    if (typeof raw.summary !== 'string' || typeof raw.why !== 'string') return undefined
    const impact = Array.isArray(raw.impact)
      ? raw.impact
          .filter(i => i && typeof i.text === 'string')
          .map(i => ({ text: i.text, warn: i.warn === true }))
      : []
    return { summary: raw.summary, why: raw.why, impact }
  } catch {
    return undefined
  }
}

export function itemKey(item: Pick<InboxItem, 'repo' | 'number'>): string {
  return `${item.repo}#${item.number}`
}

// The commit my latest submitted review was left on; undefined when I never submitted one.
export function lastReviewedSha(reviews: PrDetail['reviews'], me: string): string | undefined {
  const mine = (reviews ?? []).filter(r => r.state !== 'PENDING' && r.author?.login.toLowerCase() === me.toLowerCase())
  return mine.at(-1)?.commit?.oid
}

// Hidden until the PR gets a new commit.
export function isHidden(hidden: Record<string, string>, item: InboxItem): boolean {
  return hidden[itemKey(item)] === item.headSha
}

// The keys a session has shown as ready; a draft is left out so it announces once it is ready.
export function shownReady(items: InboxItem[]): string[] {
  return items.filter(i => !i.isDraft).map(itemKey)
}

// A session's first look has nothing to compare against, so it announces nothing.
export function newArrivals(seen: string[] | undefined, items: InboxItem[]): InboxItem[] {
  if (seen === undefined) return []
  const known = new Set(seen)
  return items.filter(i => !i.isDraft && !known.has(itemKey(i)))
}

export function sinceRules(language: Language): string {
  return `You tell a reviewer what changed in a pull request since they last reviewed it.
${MESSAGES[language].model.since}
Say what changed in behaviour, not which files. No function names, file paths or ticket ids.
Reply with the sentences only.`
}

export function sincePrompt(commits: string[], files: string[]): string {
  return [
    `Commits since the last review:\n${commits.map(c => `- ${c.split('\n')[0]}`).join('\n')}`,
    `Files changed since the last review:\n${files.slice(0, 60).join('\n')}`,
  ].join('\n\n')
}

// The style line is said once per prompt, so adding several PRs repeats only the requests.
export function reviewPrompt(draft: string, item: InboxItem, m: Messages, style?: string): string {
  const lines = [m.prompt.review(item.url)]
  const styleLine = style ? `${m.prompt.style}${style}` : undefined
  if (styleLine && !draft.includes(styleLine)) lines.push(styleLine)
  const warnings = item.impact.filter(i => i.warn).map(i => i.text)
  if (warnings.length > 0) lines.push(`${m.prompt.check}${warnings.join(' / ')}`)
  if (item.sinceLastReview) lines.push(`${m.prompt.since}${item.sinceLastReview}`)
  const text = `${lines.join('\n')}\n`
  return draft === '' || draft.endsWith('\n') ? text : `\n${text}`
}

// What the drawer adds to the draft when it closes: one request per PR not already in it, in the order pressed.
export function reviewPrompts(draft: string, items: InboxItem[], m: Messages, style?: string): string {
  let text = draft
  for (const item of items) if (!hasRequest(text, item.url)) text += reviewPrompt(text, item, m, style)
  return text.slice(draft.length)
}

// The link must end where the draft's link ends, so /pull/12 is not found inside /pull/123 or /pull/12/files.
export function hasRequest(draft: string, url: string): boolean {
  return new RegExp(`${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w/])`).test(draft)
}

export function minutesSince(at: number | undefined, now: number): number | undefined {
  return at === undefined ? undefined : Math.floor((now - at) / 60_000)
}

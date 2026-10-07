import type { Impact, InboxFile, InboxItem } from '../types'

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
export function cacheKey(githubUser: string, scope: string): string {
  let hash = 0x811c9dc5
  for (const ch of `${githubUser}\n${scope}`) {
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

// A PR can be requested from me directly and from my team at once; direct wins.
export function requestedVia(requests: PrDetail['reviewRequests'], me: string): string {
  if (requests.some(r => r.login?.toLowerCase() === me.toLowerCase())) return '직접 요청'
  const team = requests.find(r => r.login === undefined && (r.name || r.slug))
  return team ? `팀 요청 (${team.name ?? team.slug})` : '직접 요청'
}

export function sortItems(items: InboxItem[]): InboxItem[] {
  const isDirect = (i: InboxItem) => (i.via === '직접 요청' ? 0 : 1)
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

export function failedSummary(title: string, reason: string, prev: InboxItem | undefined, headSha: string): Summary {
  const tries = prev?.headSha === headSha ? (prev.summaryFailed ?? 0) : 0
  return { summary: title, why: `요약을 만들지 못했습니다 (${reason}).`, impact: [], summaryFailed: tries + 1 }
}

export const SUMMARY_RULES = `You summarize a GitHub pull request for a reviewer who has not opened it yet.
Write in Korean, formal 합니다체, as if explaining to a junior developer.

Return only JSON: {"summary": string, "why": string, "impact": [{"text": string, "warn": boolean}]}
- summary: one sentence. What changes for users or teammates, not how the code changes.
- why: one or two sentences. The problem that exists without this PR.
- impact: one to three items. Which screens, APIs, data or services this touches, and whether existing behaviour stays the same.
  Set warn true only for: hard to roll back (DB schema, data migration), a required deploy or merge order, another service affected, permission or security changes.
- Each sentence about 40 Korean characters, one idea per sentence.
- No function names, file paths, class names, internal acronyms or issue numbers. Say what a thing does instead.
- No filler words such as 효과적으로, 전반적으로, 다양한.

Example of a bad summary: "UserCache 클래스를 리팩터링하여 SessionStore의 조회 경로를 통합했습니다."
Example of a good summary: "로그인 직후 프로필 사진이 가끔 비어 보이던 문제를 고쳤습니다."`

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

export const SINCE_RULES = `You tell a reviewer what changed in a pull request since they last reviewed it.
Write in Korean, formal 합니다체, one or two short sentences, about 40 Korean characters each.
Say what changed in behaviour, not which files. No function names, file paths or ticket ids.
Reply with the sentences only.`

export function sincePrompt(commits: string[], files: string[]): string {
  return [
    `Commits since the last review:\n${commits.map(c => `- ${c.split('\n')[0]}`).join('\n')}`,
    `Files changed since the last review:\n${files.slice(0, 60).join('\n')}`,
  ].join('\n\n')
}

export function reviewPrompt(draft: string, item: InboxItem): string {
  const lines = [`${item.url} 리뷰해 줘.`, `요약: ${item.summary}`]
  const warnings = item.impact.filter(i => i.warn).map(i => i.text)
  if (warnings.length > 0) lines.push(`특히 확인할 점: ${warnings.join(' / ')}`)
  if (item.sinceLastReview) lines.push(`지난 내 리뷰 이후 바뀐 점: ${item.sinceLastReview}`)
  const text = `${lines.join('\n')}\n`
  return draft === '' || draft.endsWith('\n') ? text : `\n${text}`
}

export function minutesAgo(at: number | undefined, now: number): string | undefined {
  if (at === undefined) return undefined
  const minutes = Math.floor((now - at) / 60_000)
  return minutes < 1 ? '방금 갱신' : `${minutes}분 전 갱신`
}

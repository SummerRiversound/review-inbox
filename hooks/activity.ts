import type { Thread } from '../types'

// The newest threads read; GitHub serves at most 50 a page.
export const ACTIVITY_LIMIT = 100
const PER_PAGE = 50
// Threads updated in the last 30 days, like references.
export const ACTIVITY_DAYS = 30
export const UNDO_MS = 10_000

// Already a card on another tab, or nothing to act on: left out whatever their target.
const LEFT_OUT = ['review_requested', 'assign', 'mention', 'subscribed']

// Read ones too, as GitHub's own inbox keeps them until Done; the window starts at midnight UTC so a day's looks ask the same.
export function notificationsPath(page: number, now: number) {
  const since = new Date((Math.floor(now / 86_400_000) - ACTIVITY_DAYS) * 86_400_000).toISOString()
  return `notifications?all=true&participating=true&per_page=${PER_PAGE}&page=${page}&since=${since}`
}

export const THREAD_JQ = '[.[] | {id, unread, reason, updated_at, title: .subject.title, url: .subject.url, repo: .repository.full_name}]'

// `gh api -i` prints the status line and headers, a blank line, then the body.
export function splitResponse(text: string): { headers: Record<string, string>; body: string } {
  const at = text.search(/\r?\n\r?\n/)
  const head = at < 0 ? text : text.slice(0, at)
  const headers = Object.fromEntries(
    head
      .split(/\r?\n/)
      .slice(1)
      .map(line => [line.slice(0, line.indexOf(':')).trim().toLowerCase(), line.slice(line.indexOf(':') + 1).trim()]),
  )
  return { headers, body: at < 0 ? '' : text.slice(at).trim() }
}

export const hasNextPage = (headers: Record<string, string>) => /rel="next"/.test(headers.link ?? '')

export function pollAfter(headers: Record<string, string>, now: number) {
  const seconds = Number(headers['x-poll-interval'])
  return Number.isFinite(seconds) && seconds > 0 ? now + seconds * 1000 : undefined
}

// The subject's API URL as its page; a subject without one, such as a discussion, opens the repository.
export function htmlUrl(api: string | null, repo: string) {
  const path = api?.match(/^https:\/\/api\.github\.com\/repos\/(.+)$/)?.[1]
  if (!path) return `https://github.com/${repo}`
  return `https://github.com/${path.replace(/\/pulls\/(\d+)$/, '/pull/$1').replace(/\/commits\/(\w+)$/, '/commit/$1').replace(/\/releases\/\d+$/, '/releases')}`
}

export type RawThread = { id: string; unread: boolean; reason: string; updated_at: string; title: string; url: string | null; repo: string }

export const toThread = (raw: RawThread): Thread => ({
  id: raw.id,
  repo: raw.repo,
  title: raw.title,
  // A workflow run has no subject URL; its repository's Actions page lists the run.
  url: raw.reason === 'ci_activity' && !raw.url ? `https://github.com/${raw.repo}/actions` : htmlUrl(raw.url, raw.repo),
  reason: raw.reason,
  updatedAt: raw.updated_at,
  unread: raw.unread,
})

export const threadKey = (thread: Thread) => `thread:${thread.id}`

// A Done thread stays hidden until it has new activity.
export const isThreadHidden = (hidden: Record<string, string>, thread: Thread) => hidden[threadKey(thread)] === thread.updatedAt

// What the tab shows: no thread that is a card on another tab, or of a reason left out.
export const shownThreads = (threads: Thread[], cardUrls: Set<string>) =>
  threads.filter(t => !LEFT_OUT.includes(t.reason) && !cardUrls.has(t.url))

// The tab's sections, in an order that does not shift as notifications arrive: talk first, then what happened on its own.
const REASON_ORDER = ['comment', 'team_mention', 'state_change', 'ci_activity', 'security_alert', 'author']

export function byReason(threads: Thread[]): [string, Thread[]][] {
  const reasons = [...new Set(threads.map(t => t.reason))]
  const rank = (reason: string) => (REASON_ORDER.includes(reason) ? REASON_ORDER.indexOf(reason) : REASON_ORDER.length)
  return reasons.sort((a, b) => rank(a) - rank(b)).map(reason => [reason, threads.filter(t => t.reason === reason)])
}

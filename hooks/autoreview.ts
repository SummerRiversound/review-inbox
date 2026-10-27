import type { AutoReviewFile, AutoState, InboxItem } from '../types'
import { itemKey } from './inbox'

// Authors often push again right after asking; a head this still is the one worth a review.
export const SETTLE_MS = 30 * 60_000
// Past either, one review could take a large share of a day's tokens, so only Run auto review starts it.
export const MAX_FILES = 50
export const MAX_LINES = 2_000
export const DAILY_DEFAULT = 5

export type AutoSettings = { isOn: boolean; daily: number | undefined }

// `unlimited` has no limit; anything unreadable falls back to the default.
export function parseDaily(option: string | undefined): number | undefined {
  if (option === 'unlimited') return undefined
  const n = Number(option)
  return Number.isInteger(n) && n > 0 ? n : DAILY_DEFAULT
}

// One job per PR on the list, keyed by its head: a new head starts its wait over and forgets a run asked for by hand.
export function trackHeads(file: AutoReviewFile, items: InboxItem[], now: number): AutoReviewFile {
  const jobs: AutoReviewFile['jobs'] = {}
  for (const item of items) {
    const key = itemKey(item)
    const job = file.jobs[key]
    jobs[key] = job?.headSha === item.headSha ? job : { headSha: item.headSha, firstSeenAt: now }
  }
  return { ...file, jobs }
}

// Asked of me directly, ready, by a person, and not reviewed by me at this head.
const isCandidate = (item: InboxItem) => !item.isDraft && item.team === undefined && !item.isBot && item.reviewedSha !== item.headSha

const isTooBig = (item: InboxItem) => item.files > MAX_FILES || item.additions + item.deletions > MAX_LINES

export const startedToday = (file: AutoReviewFile, now: number) => (file.day === new Date(now).toDateString() ? (file.started ?? 0) : 0)

// What each card's auto-review line says; a card left out shows none. Costs nothing: no GitHub call, no model call.
export function autoStates(file: AutoReviewFile, items: InboxItem[], settings: AutoSettings, now: number): Record<string, AutoState> {
  if (!settings.isOn) return {}
  const states: Record<string, AutoState> = {}
  const ready: { key: string; item: InboxItem; isManual: boolean }[] = []
  for (const item of items.filter(isCandidate)) {
    const key = itemKey(item)
    const job = file.jobs[key]
    if (job?.headSha !== item.headSha) continue
    if (job.manual) {
      ready.push({ key, item, isManual: true })
    } else if (file.enabledAt === undefined || Date.parse(item.requestedAt) < file.enabledAt) {
      states[key] = { kind: 'manual', why: 'before' }
    } else if (isTooBig(item)) {
      states[key] = { kind: 'manual', why: 'too-big' }
    } else if (now < job.firstSeenAt + SETTLE_MS) {
      states[key] = { kind: 'settling', startsAt: job.firstSeenAt + SETTLE_MS }
    } else {
      ready.push({ key, item, isManual: false })
    }
  }
  const isCapped = settings.daily !== undefined && startedToday(file, now) >= settings.daily
  const queue = ready
    .filter(r => r.isManual || !isCapped)
    .sort((a, b) => Number(b.isManual) - Number(a.isManual) || Date.parse(a.item.requestedAt) - Date.parse(b.item.requestedAt))
  queue.forEach((r, ahead) => (states[r.key] = { kind: 'queued', ahead }))
  for (const r of ready.filter(r => !r.isManual && isCapped)) states[r.key] = { kind: 'capped' }
  return states
}

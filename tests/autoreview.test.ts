import { expect, test } from 'claude-code/testing'

import type { AutoReviewFile, InboxItem } from '../types'
import { SETTLE_MS, autoStates, parseDaily, trackHeads } from '../hooks/autoreview'

const HOUR = 60 * 60_000
const T0 = Date.parse('2026-10-27T09:00:00Z')

const item = (number: number, more: Partial<InboxItem> = {}): InboxItem => ({
  repo: 'o/r',
  number,
  title: `r${number}`,
  url: `https://github.com/o/r/pull/${number}`,
  headSha: `h${number}`,
  author: 'dev',
  createdAt: '2026-10-27T08:00:00Z',
  requestedAt: '2026-10-27T10:00:00Z',
  isDraft: false,
  files: 3,
  additions: 40,
  deletions: 5,
  summary: 's',
  why: '',
  impact: [],
  isRerequest: false,
  ...more,
})

const ON = { isOn: true, daily: 5 }
// Turned on at 09:00; the requests above came at 10:00 and their heads were first seen then.
const tracked = (items: InboxItem[], more: Partial<AutoReviewFile> = {}): AutoReviewFile => ({
  ...trackHeads({ jobs: {} }, items, Date.parse('2026-10-27T10:00:00Z')),
  enabledAt: T0,
  ...more,
})

test('a head is remembered from when this machine first saw it, a new head starts over, and a PR that left the list is dropped', () => {
  const first = trackHeads({ jobs: {} }, [item(1), item(2)], 100)
  expect(first.jobs).toEqual({ 'o/r#1': { headSha: 'h1', firstSeenAt: 100 }, 'o/r#2': { headSha: 'h2', firstSeenAt: 100 } })

  const manual = { ...first, jobs: { ...first.jobs, 'o/r#1': { headSha: 'h1', firstSeenAt: 100, manual: true as const } } }
  const later = trackHeads(manual, [item(1), item(2, { headSha: 'h2b' })], 500)
  expect(later.jobs).toEqual({ 'o/r#1': { headSha: 'h1', firstSeenAt: 100, manual: true }, 'o/r#2': { headSha: 'h2b', firstSeenAt: 500 } })

  expect(trackHeads(later, [item(2, { headSha: 'h2b' })], 900).jobs).toEqual({ 'o/r#2': { headSha: 'h2b', firstSeenAt: 500 } })
})

test('with auto review off no card shows anything', () => {
  const items = [item(1)]
  expect(autoStates(tracked(items), items, { isOn: false, daily: 5 }, T0 + 5 * HOUR)).toEqual({})
})

test('team requests, drafts, bot PRs and a head I already reviewed are left alone', () => {
  const items = [item(1, { team: 'core' }), item(2, { isDraft: true }), item(3, { isBot: true }), item(4, { reviewedSha: 'h4' })]
  expect(autoStates(tracked(items), items, ON, T0 + 5 * HOUR)).toEqual({})
})

test('a head waits 30 minutes from when it was first seen, then joins the queue oldest request first', () => {
  const items = [item(1, { requestedAt: '2026-10-27T10:20:00Z' }), item(2)]
  const file = tracked(items)
  const seen = Date.parse('2026-10-27T10:00:00Z')

  expect(autoStates(file, items, ON, seen + SETTLE_MS - 1)).toEqual({
    'o/r#1': { kind: 'settling', startsAt: seen + SETTLE_MS },
    'o/r#2': { kind: 'settling', startsAt: seen + SETTLE_MS },
  })
  expect(autoStates(file, items, ON, seen + SETTLE_MS)).toEqual({
    'o/r#2': { kind: 'queued', ahead: 0 },
    'o/r#1': { kind: 'queued', ahead: 1 },
  })
})

test('a request from before auto review was turned on, or a PR too big, starts only by hand', () => {
  const items = [item(1, { requestedAt: '2026-10-27T08:59:00Z' }), item(2, { files: 51 }), item(3, { additions: 1_500, deletions: 501 })]
  expect(autoStates(tracked(items), items, ON, T0 + 5 * HOUR)).toEqual({
    'o/r#1': { kind: 'manual', why: 'before' },
    'o/r#2': { kind: 'manual', why: 'too-big' },
    'o/r#3': { kind: 'manual', why: 'too-big' },
  })
  // A re-request after turning it on counts as new.
  const again = [item(1, { requestedAt: '2026-10-27T09:30:00Z', isRerequest: true, reviewedSha: 'h0' })]
  expect(autoStates(tracked(again), again, ON, T0 + 5 * HOUR)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
})

test('a run asked for by hand skips the wait and the size and goes first, past the daily limit', () => {
  const items = [item(1), item(2, { files: 80 })]
  const file = tracked(items)
  const asked = { ...file, day: new Date(T0).toDateString(), started: 5, jobs: { ...file.jobs, 'o/r#2': { ...file.jobs['o/r#2']!, manual: true as const } } }
  expect(autoStates(asked, items, ON, Date.parse('2026-10-27T10:05:00Z'))).toEqual({
    'o/r#1': { kind: 'settling', startsAt: Date.parse('2026-10-27T10:30:00Z') },
    'o/r#2': { kind: 'queued', ahead: 0 },
  })
})

test('the daily limit holds settled heads in the queue until the next day, and unlimited never does', () => {
  const items = [item(1)]
  const today = Date.parse('2026-10-27T12:00:00Z')
  const file = tracked(items, { day: new Date(today).toDateString(), started: 5 })
  expect(autoStates(file, items, ON, today)).toEqual({ 'o/r#1': { kind: 'capped' } })
  expect(autoStates(file, items, { isOn: true, daily: undefined }, today)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
  expect(autoStates(file, items, ON, today + 24 * HOUR)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
})

test('a head the mod has not seen yet shows nothing until the next fetch records it', () => {
  const items = [item(1)]
  expect(autoStates({ enabledAt: T0, jobs: {} }, items, ON, T0 + 5 * HOUR)).toEqual({})
})

test('the daily limit setting reads unlimited as none and anything unreadable as the default', () => {
  expect([parseDaily('3'), parseDaily('20'), parseDaily('unlimited'), parseDaily(undefined), parseDaily('x')]).toEqual([3, 20, undefined, 5, 5])
})

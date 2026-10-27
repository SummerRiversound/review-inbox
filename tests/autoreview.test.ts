import { expect, test } from 'claude-code/testing'

import type { AutoReviewFile, InboxItem } from '../types'
import {
  SETTLE_MS,
  autoStates,
  contentKey,
  createArgs,
  createInput,
  myReview,
  nextJob,
  parseDaily,
  parseReview,
  placeFindings,
  reviewBody,
  reviewerPrompt,
  reviewerSpec,
  trackHeads,
} from '../hooks/autoreview'

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

test('a running, finished or failed job shows as such whatever the gates say, and nothing starts while one runs', () => {
  const items = [item(1, { requestedAt: '2026-10-27T08:00:00Z' }), item(2), item(3)]
  const file = tracked(items)
  const result = { verdict: 'approve' as const, summary: 'ok', findings: [] }
  file.jobs['o/r#1'] = { ...file.jobs['o/r#1']!, status: 'running', startedAt: 7 }
  file.jobs['o/r#2'] = { ...file.jobs['o/r#2']!, status: 'done', result, tokens: 900 }
  const states = autoStates(file, items, ON, T0 + 5 * HOUR)
  expect(states).toEqual({ 'o/r#1': { kind: 'running', since: 7 }, 'o/r#2': { kind: 'done', result, tokens: 900 }, 'o/r#3': { kind: 'queued', ahead: 0 } })
  expect(nextJob(states)).toBeUndefined()
  file.jobs['o/r#1'] = { ...file.jobs['o/r#1']!, status: 'failed', error: 'x' }
  expect(nextJob(autoStates(file, items, ON, T0 + 5 * HOUR))).toBe('o/r#3')
})

test("the reviewer's answer is read from one JSON object, fenced or not, and findings it cannot place are dropped", () => {
  const answer = 'Here it is:\n```json\n{"verdict":"request-changes","summary":"S","findings":[{"severity":"major","path":"a.ts","line":3,"body":"B"},{"severity":"huge","path":"a.ts","line":1,"body":"x"},{"severity":"nit","path":"a.ts","line":0,"body":"x"}]}\n```'
  expect(parseReview(answer)).toEqual({ verdict: 'request-changes', summary: 'S', findings: [{ severity: 'major', path: 'a.ts', line: 3, body: 'B' }] })
  expect(parseReview('{"verdict":"lgtm","summary":"S","findings":[]}')).toBeUndefined()
  expect(parseReview('no json here')).toBeUndefined()
  expect(parseReview('{"verdict": "approve", "summary": ')).toBeUndefined()
})

test('a finding on a changed or context line of a hunk becomes a comment, any other goes into the body with the marker', () => {
  // New-file lines 10 to 13: 10 context, 11 added, removed line skipped, 12 context; 20 is outside every hunk.
  const files = [{ filename: 'a.ts', patch: '@@ -10,3 +10,3 @@ fn\n keep\n+added\n-gone\n keep2' }, { filename: 'bin.png' }]
  const findings = [
    { severity: 'major' as const, path: 'a.ts', line: 11, body: 'on the added line' },
    { severity: 'minor' as const, path: 'a.ts', line: 12, body: 'on context' },
    { severity: 'nit' as const, path: 'a.ts', line: 20, body: 'outside' },
    { severity: 'minor' as const, path: 'bin.png', line: 1, body: 'no patch' },
    { severity: 'minor' as const, path: 'other.ts', line: 1, body: 'not in the PR' },
  ]
  const { comments, rest } = placeFindings(files, findings)
  expect(comments).toEqual([
    { path: 'a.ts', line: 11, side: 'RIGHT', body: '**major** on the added line' },
    { path: 'a.ts', line: 12, side: 'RIGHT', body: '**minor** on context' },
  ])
  expect(rest.map(f => f.body)).toEqual(['outside', 'no patch', 'not in the PR'])
  expect(reviewBody('Looks fine.', rest.slice(0, 1), 'abc', 'k1')).toBe(
    'Looks fine.\n\n- `a.ts:20` **nit** outside\n\n<!-- review-inbox auto-review sha=abc key=k1 -->',
  )
})

test('the pending review is created on the head with no event, its comments and body on stdin', () => {
  expect(createArgs({ repo: 'o/r', number: 5 })).toEqual(['api', '-X', 'POST', 'repos/o/r/pulls/5/reviews', '--input', '-', '--jq', '.id'])
  const comments = [{ path: 'a.ts', line: 2, side: 'RIGHT' as const, body: 'b' }]
  expect(JSON.parse(createInput('h5', 'body', comments))).toEqual({ commit_id: 'h5', body: 'body', comments })
})

test('the content key ignores file order and changes with any patch', () => {
  const a = { filename: 'a.ts', patch: '@@ -1 +1 @@\n+x' }
  const b = { filename: 'b.ts', patch: '@@ -1 +1 @@\n+y' }
  expect(contentKey([a, b])).toBe(contentKey([b, a]))
  expect(contentKey([a, b])).not.toBe(contentKey([a, { ...b, patch: '@@ -1 +1 @@\n+z' }]))
  expect(contentKey([a])).toMatch(/^[0-9a-f]{16}$/)
})

test('my review of this head, or my pending review on any commit, stops a new one', () => {
  const r = (id: number, state: string, commit: string, login = 'Me') => ({ id, state, commit_id: commit, login })
  expect(myReview([r(1, 'COMMENTED', 'old'), r(2, 'APPROVED', 'h', 'other')], 'me', 'h')).toBeUndefined()
  expect(myReview([r(1, 'COMMENTED', 'h')], 'me', 'h')).toEqual({ kind: 'reviewed' })
  expect(myReview([r(1, 'COMMENTED', 'h'), r(3, 'PENDING', 'old')], 'me', 'h')).toEqual({ kind: 'pending', id: 3 })
})

test('the reviewer reads and searches only, keeps CLAUDE.md, and preloads the listed skills', () => {
  const spec = reviewerSpec('sonnet', ['review-playbook'])
  expect(spec.tools).toEqual(['Read', 'Grep', 'Glob'])
  expect('omitClaudeMd' in spec).toBe(false)
  expect(spec.skills).toEqual(['review-playbook'])
  expect('skills' in reviewerSpec('opus', [])).toBe(false)
})

test("a re-request asks for what changed since my last review, and the style line goes in when there is one", () => {
  const again = reviewerPrompt(item(1, { reviewedSha: 'old' }), { hasCheckout: false, style: 'asks why first', language: 'Write in English.' })
  expect(again.includes('since.diff')).toBe(true)
  expect(again.includes('How I review: asks why first')).toBe(true)
  expect(again.includes('Only the diff is here')).toBe(true)
  expect(reviewerPrompt(item(1), { hasCheckout: true, language: '' }).includes('How I review')).toBe(false)
})

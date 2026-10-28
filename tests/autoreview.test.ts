import { expect, test } from 'claude-code/testing'

import type { AutoReviewFile, InboxItem } from '../types'
import {
  REVIEWER_RULES,
  agentName,
  SETTLE_MS,
  autoStates,
  carried,
  contentKey,
  createArgs,
  createInput,
  isLockPath,
  myReview,
  nextJob,
  parseDaily,
  parseSettle,
  parseSeverityNames,
  parseReview,
  placeFindings,
  readLock,
  reviewBody,
  reviewerPrompt,
  reviewerSpec,
  setupList,
  verifierPrompt,
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

const ON = { isOn: true, daily: 5, large: true, backlog: true, settleMs: SETTLE_MS }
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
  expect(autoStates(tracked(items), items, { ...ON, isOn: false }, T0 + 5 * HOUR)).toEqual({})
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

test('a request from before auto review was turned on, and a PR too big, are reviewed too unless their setting is off', () => {
  const items = [item(1, { requestedAt: '2026-10-27T08:59:00Z' }), item(2, { files: 51 }), item(3, { additions: 1_500, deletions: 501 })]
  expect(autoStates(tracked(items), items, ON, T0 + 5 * HOUR)).toEqual({
    'o/r#1': { kind: 'queued', ahead: 0 },
    'o/r#2': { kind: 'queued', ahead: 1 },
    'o/r#3': { kind: 'queued', ahead: 2 },
  })
  const OFF = { ...ON, large: false, backlog: false }
  expect(autoStates(tracked(items), items, OFF, T0 + 5 * HOUR)).toEqual({
    'o/r#1': { kind: 'manual', why: 'before' },
    'o/r#2': { kind: 'manual', why: 'too-big' },
    'o/r#3': { kind: 'manual', why: 'too-big' },
  })
  // A re-request after turning it on counts as new.
  const again = [item(1, { requestedAt: '2026-10-27T09:30:00Z', isRerequest: true, reviewedSha: 'h0' })]
  expect(autoStates(tracked(again), again, OFF, T0 + 5 * HOUR)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
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

test('a head waits as long as autoReviewSettleMinutes says, and 0 queues it as soon as it is seen', () => {
  const items = [item(1)]
  const file = tracked(items)
  const seen = Date.parse('2026-10-27T10:00:00Z')
  const tenMinutes = { ...ON, settleMs: 10 * 60_000 }

  expect(autoStates(file, items, tenMinutes, seen + 10 * 60_000 - 1)).toEqual({ 'o/r#1': { kind: 'settling', startsAt: seen + 10 * 60_000 } })
  expect(autoStates(file, items, tenMinutes, seen + 10 * 60_000)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
  expect(autoStates(file, items, { ...ON, settleMs: 0 }, seen)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
})

test('the wait counts from the head commit\'s time when GitHub gives it, so an old head starts as soon as it is seen', () => {
  const seen = Date.parse('2026-10-27T10:00:00Z')
  const old = [item(1, { headCommittedAt: '2026-10-25T10:00:00Z' })]
  expect(autoStates(tracked(old), old, ON, seen)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })

  const fresh = [item(1, { headCommittedAt: '2026-10-27T09:50:00Z' })]
  expect(autoStates(tracked(fresh), fresh, ON, seen)).toEqual({ 'o/r#1': { kind: 'settling', startsAt: Date.parse('2026-10-27T09:50:00Z') + SETTLE_MS } })

  const unreadable = [item(1, { headCommittedAt: 'soon' })]
  expect(autoStates(tracked(unreadable), unreadable, ON, seen)).toEqual({ 'o/r#1': { kind: 'settling', startsAt: seen + SETTLE_MS } })
})

test('autoReviewSettleMinutes reads whole minutes from 0, and anything else falls back to 30', () => {
  expect([parseSettle('0'), parseSettle('10'), parseSettle('120'), parseSettle(undefined), parseSettle('-5'), parseSettle('x'), parseSettle('1.5')]).toEqual(
    [0, 10, 120, 30, 30, 30, 30].map(m => m * 60_000),
  )
})

test('the daily limit holds settled heads in the queue until the next day, and unlimited never does', () => {
  const items = [item(1)]
  const today = Date.parse('2026-10-27T12:00:00Z')
  const file = tracked(items, { day: new Date(today).toDateString(), started: 5 })
  expect(autoStates(file, items, ON, today)).toEqual({ 'o/r#1': { kind: 'capped' } })
  expect(autoStates(file, items, { ...ON, daily: undefined }, today)).toEqual({ 'o/r#1': { kind: 'queued', ahead: 0 } })
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

const NAMES = { blocker: '블로커', major: '메이저', minor: '마이너', nit: 'nit' }

test('a finding on a changed or context line of a hunk becomes a comment that opens with its severity and conclusion in bold, the reason below; any other goes into the body', () => {
  // New-file lines 10 to 13: 10 context, 11 added, removed line skipped, 12 context; 20 is outside every hunk.
  const files = [{ filename: 'a.ts', patch: '@@ -10,3 +10,3 @@ fn\n keep\n+added\n-gone\n keep2' }, { filename: 'bin.png' }]
  const findings = [
    { severity: 'major' as const, path: 'a.ts', line: 11, body: 'on the added line\nbecause it breaks' },
    { severity: 'minor' as const, path: 'a.ts', line: 12, body: 'on context' },
    { severity: 'nit' as const, path: 'a.ts', line: 20, body: 'outside' },
    { severity: 'minor' as const, path: 'bin.png', line: 1, body: 'no patch' },
    { severity: 'minor' as const, path: 'other.ts', line: 1, body: 'not in the PR' },
  ]
  const { comments, rest } = placeFindings(files, findings, NAMES)
  expect(comments).toEqual([
    { path: 'a.ts', line: 11, side: 'RIGHT', body: '**메이저 · on the added line**\nbecause it breaks' },
    { path: 'a.ts', line: 12, side: 'RIGHT', body: '**마이너 · on context**' },
  ])
  expect(rest.map(f => f.body)).toEqual(['outside', 'no patch', 'not in the PR'])
})

test('findings in the body are grouped under a heading per severity, most severe first, each a bold conclusion with its reason and place below', () => {
  const rest = [
    { severity: 'nit' as const, path: 'a.ts', line: 20, body: 'outside' },
    { severity: 'blocker' as const, path: 'b.ts', line: 3, body: 'data loss\nrows are dropped' },
    { severity: 'nit' as const, path: 'c.ts', line: 7, body: 'naming' },
  ]
  expect(reviewBody('Looks fine.', rest, 'abc', 'k1', NAMES)).toBe(
    'Looks fine.\n\n### 블로커\n\n**data loss**\nrows are dropped (`b.ts:3`)\n\n### nit\n\n**outside** (`a.ts:20`)\n\n**naming** (`c.ts:7`)\n\n<!-- review-inbox auto-review sha=abc key=k1 -->',
  )
  expect(reviewBody('LGTM', [], 'abc', 'k1', NAMES)).toBe('LGTM\n\n<!-- review-inbox auto-review sha=abc key=k1 -->')
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
  expect(myReview([r(1, 'COMMENTED', 'h'), r(3, 'PENDING', 'old')], 'me', 'h')).toEqual({ kind: 'pending', id: 3, commit: 'old' })
})

test('the reviewer reads and searches only, keeps CLAUDE.md, and preloads the listed skills', () => {
  const spec = reviewerSpec('sonnet', ['review-playbook'])
  expect(spec.tools).toEqual(['Read', 'Grep', 'Glob'])
  expect('omitClaudeMd' in spec).toBe(false)
  expect(spec.skills).toEqual(['review-playbook'])
  expect('skills' in reviewerSpec('opus', [])).toBe(false)
})

test('a new head keeps my pending review of the old one for carrying, and a PR gone from the list drops its job, a running one too', () => {
  const result = { verdict: 'comment' as const, summary: 's', findings: [] }
  const file = {
    jobs: {
      'o/r#1': { headSha: 'h1', firstSeenAt: 0, status: 'done' as const, reviewId: 9, contentKey: 'k', result },
      'o/r#2': { headSha: 'h2', firstSeenAt: 0, status: 'running' as const, agentId: 'a1' },
    },
  }
  const next = trackHeads(file, [item(1, { headSha: 'h1b' })], 5)
  expect(next.jobs).toEqual({ 'o/r#1': { headSha: 'h1b', firstSeenAt: 5, prev: { headSha: 'h1', reviewId: 9, contentKey: 'k', result } } })
  // Still pending on h1 when the head moves again.
  expect(trackHeads(next, [item(1, { headSha: 'h1c' })], 6).jobs['o/r#1']!.prev!.headSha).toBe('h1')
})

test('a carried review keeps each line comment at its diff position, names the new commit, and moves a whole-file comment into the body', () => {
  // GitHub lists a pending review's comments by diff position alone; the same content gives the same positions on the new head.
  const moved = carried('Body\n\n<!-- review-inbox auto-review sha=old key=k -->', [
    { path: 'a.ts', position: 3, body: 'x' },
    { path: 'b.ts', position: null, body: 'y' },
  ], 'old', 'new')
  expect(moved).toEqual({ body: 'Body\n\n<!-- review-inbox auto-review sha=new key=k -->\n\n- `b.ts` y', comments: [{ path: 'a.ts', position: 3, body: 'x' }] })
})

test("a re-request asks for what changed since my last review, and the learned style goes in as tone only when there is one", () => {
  const again = reviewerPrompt(item(1, { reviewedSha: 'old' }), { folder: '/runs/o-r-1-h1', hasCheckout: false, style: 'asks why first', language: 'Write in English.' })
  expect(again.includes('/runs/o-r-1-h1/since.diff')).toBe(true)
  expect(again.includes('How I usually sound (tone only; the writing rules and my instructions win where they differ): asks why first')).toBe(true)
  expect(again.includes('Only the diff is here')).toBe(true)
  expect(reviewerPrompt(item(1), { folder: '/runs/o-r-1-h1', hasCheckout: true, language: '' }).includes('How I usually sound')).toBe(false)
})

// The engine may start the reviewer in the session's folder rather than the run folder, so the task names every file by its full path.
test('the task names the run folder by its full path, so the reviewer finds the diff and the checkout wherever it starts', () => {
  const task = reviewerPrompt(item(1), { folder: '/runs/o-r-1-h1', hasCheckout: true, language: '' })
  expect(task.includes('/runs/o-r-1-h1/pr.diff')).toBe(true)
  expect(task.includes('/runs/o-r-1-h1/repo/')).toBe(true)
})

test("severity names are mine when I set all four, blocker to nit, and the language's own otherwise", () => {
  const own = { blocker: '블로커', major: '메이저', minor: '마이너', nit: 'nit' }
  expect(parseSeverityNames('블로커, 결정 필요, 보완, nit', own)).toEqual({ blocker: '블로커', major: '결정 필요', minor: '보완', nit: 'nit' })
  expect([parseSeverityNames('', own), parseSeverityNames(undefined, own), parseSeverityNames('a, b, c', own), parseSeverityNames('a, , c, d', own)]).toEqual([own, own, own, own])
})

test('the summary counts findings by the names the labels show', () => {
  const task = reviewerPrompt(item(1), { folder: '/runs/o-r-1-h1', hasCheckout: true, language: '', severities: { blocker: '블로커', major: '결정 필요', minor: '보완', nit: 'nit' } })
  expect(task.includes('call the severities blocker "블로커", major "결정 필요", minor "보완", nit "nit"')).toBe(true)
})

test('my own instructions go into the task, winning over the built-in rules, when I wrote some, and nothing is added when I did not', () => {
  const facts = { folder: '/runs/o-r-1-h1', hasCheckout: true, language: '' }
  expect(reviewerPrompt(item(1), { ...facts, instructions: 'Check the SQL first.' }).includes(`${MINE} Check the SQL first.`)).toBe(true)
  expect(reviewerPrompt(item(1), facts).includes('My instructions')).toBe(false)
})

test('the setup list names every auto review setting but on and off, which the switch keeps, with what it does, what it takes, its default and its value now, an unset one as its default', () => {
  const list = setupList({ autoReviewModel: 'opus', autoReviewInstructions: 'Check the SQL first.' })
  const keys = list.split('\n').map(line => line.slice(2, line.indexOf(':')))
  expect(keys).toEqual(['autoReviewPost', 'autoReviewModel', 'autoReviewVerify', 'autoReviewDaily', 'autoReviewSettleMinutes', 'autoReviewSkills', 'autoReviewInstructions', 'autoReviewSeverityNames', 'autoReviewLarge', 'autoReviewBacklog'])
  expect(list.includes('- autoReviewModel: the model the reviewer runs on; opus reviews deeper and costs more. Takes sonnet | opus; default sonnet; now opus')).toBe(true)
  expect(list.includes('default empty; now Check the SQL first.')).toBe(true)
  expect(list.includes('default 5; now 5 (default)')).toBe(true)
  expect(list.includes('default empty; now empty (default)')).toBe(true)
})

test('the check of a draft hands over its findings and the run folder, keeps only what the code bears out, and rewrites what breaks the writing rules', () => {
  const draft = { verdict: 'request-changes' as const, summary: 'One bug.', findings: [{ severity: 'major' as const, path: 'a.ts', line: 2, body: 'two is off by one' }] }
  const task = verifierPrompt(draft, { folder: '/runs/o-r-1-h1', hasCheckout: true, instructions: 'Check the SQL first.', language: 'Write in Korean.' })
  expect(task.includes(JSON.stringify(draft))).toBe(true)
  expect(task.includes('/runs/o-r-1-h1/pr.diff')).toBe(true)
  expect(task.includes('/runs/o-r-1-h1/repo/')).toBe(true)
  expect(task.includes('drop a finding the code does not bear out')).toBe(true)
  expect(task.includes('rewrite the summary and any finding that breaks the writing rules')).toBe(true)
  expect(task.includes(`${MINE} Check the SQL first.`)).toBe(true)
  expect(verifierPrompt(draft, { folder: '/runs/o-r-1-h1', hasCheckout: false, language: '' }).includes('/repo/')).toBe(false)
})

const MINE = 'My instructions for this review (they win over every rule above except the JSON reply):'

test('the built-in rules carry a way to review and a way to write for the reader, whatever skills or instructions are set', () => {
  // How to review: check every finding against the code, and grade by what merging would cost.
  expect(REVIEWER_RULES.includes('Read the code each finding points to again before you keep it')).toBe(true)
  expect(REVIEWER_RULES.includes('blocker: hard to undo after merging or harmful in production')).toBe(true)
  // How to write: the verdict alone on the first line without a greeting, a conclusion line then its reason a finding, what breaks and what to decide rather than how the code works, no file or line on a comment that already sits on the code, no account of the work.
  expect(REVIEWER_RULES.includes("The summary's first line is the verdict alone, in bold, as your own decision and with no greeting")).toBe(true)
  expect(REVIEWER_RULES.includes('Each finding body puts its conclusion alone on the first line')).toBe(true)
  expect(REVIEWER_RULES.includes('do not narrate how it works inside')).toBe(true)
  expect(REVIEWER_RULES.includes('so the body names no file or line')).toBe(true)
  expect(REVIEWER_RULES.includes('Never describe how you checked')).toBe(true)
})

test('a reviewer that cannot read the diff answers without JSON, which counts as a failed run rather than a review', () => {
  expect(REVIEWER_RULES.includes('UNREADABLE')).toBe(true)
  expect(parseReview('UNREADABLE')).toBeUndefined()
})

test("GitHub's answer to my 👀 says whether this machine added it, and a PR another machine reviews shows as running until it is looked at again", () => {
  expect(readLock('HTTP/2.0 201 Created\nEtag: "e"\n\n{"created_at":"2026-10-27T08:00:00Z","id":3}\n')).toEqual({ isNew: true, id: 3, createdAt: Date.parse('2026-10-27T08:00:00Z') })
  expect(readLock('HTTP/2.0 200 OK\n\n{"created_at":"2026-10-27T08:00:00Z","id":3}')!.isNew).toBe(false)
  expect(readLock('')).toBeUndefined()
  expect(isLockPath('repos/o/r/issues/5/reactions/3')).toBe(true)
  expect(isLockPath('repos/o/r/issues/5/reactions/3/../x')).toBe(false)

  const file = { enabledAt: 0, jobs: { 'o/r#1': { headSha: 'h1', firstSeenAt: 0, elsewhere: { since: 5, until: SETTLE_MS + 100 } } } }
  expect(autoStates(file, [item(1)], ON, 50)['o/r#1']).toEqual({ kind: 'running', since: 5 })
  expect(autoStates(file, [item(1)], ON, SETTLE_MS + 200)['o/r#1']!.kind).toBe('queued')
})

test('a subagent name keeps to letters, digits, _ and - within 64 characters, cutting a long repository name but never the PR number or head', () => {
  const valid = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
  const long = agentName('auto-review-check', 'dtonic/deview-data-modeling-service#142', '2f2195a1234')
  expect(valid.test(long)).toBe(true)
  expect(long.endsWith('-142-2f2195a')).toBe(true)
  expect(agentName('auto-review', 'my.org/some.repo#7', 'abcdef0123')).toBe('auto-review-my-org-some-repo-7-abcdef0')
  expect(agentName('auto-review', 'o/r#5', 'h5h5h5h5')).toBe('auto-review-o-r-5-h5h5h5h')
})

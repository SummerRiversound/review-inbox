import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createAutoReview, type Reviewer } from '../server/review'
import type { Gh } from '../shared/fetch'
import { DEFAULT_CONFIG, type InboxConfig } from '../shared/settings'
import type { AutoReviewFile, InboxItem } from '../shared/types'

const DAY = 86_400_000
const item = (n: number, over: Partial<InboxItem> = {}): InboxItem => ({
  repo: 'o/r', number: n, title: `PR ${n}`, url: `u${n}`, headSha: `head${n}`, author: 'ann', createdAt: '2026-11-01T00:00:00Z',
  requestedAt: `2026-11-0${n}T00:00:00Z`, isDraft: false, files: 1, additions: 2, deletions: 0, summary: '', why: '', impact: [], isRerequest: false, ...over,
})
const ANSWER = JSON.stringify({ verdict: 'comment', summary: 'Reads fine', findings: [{ severity: 'minor', path: 'a.ts', line: 1, body: 'Name it after what it holds' }] })

// GitHub for one account `me`: the reviews already on each PR, and each pending review the plugin makes.
function github(reviews: Record<number, object[]> = {}) {
  const created: { pr: string; input: { commit_id: string; body: string; comments: { path: string; line: number }[] } }[] = []
  const gh: Gh = async (args, _env, stdin) => {
    const call = args.join(' ')
    const pr = Number(/pulls\/(\d+)|pr diff (\d+)/.exec(call)?.slice(1).find(Boolean))
    if (call === 'api user --jq .login') return 'me\n'
    if (call.startsWith('api -X POST')) {
      created.push({ pr: call, input: JSON.parse(stdin!) })
      ;(reviews[pr] ??= []).push({ id: 77, state: 'PENDING', commit_id: JSON.parse(stdin!).commit_id, login: 'me' })
      return '77\n'
    }
    if (call.includes('/reviews')) return (reviews[pr] ?? []).map(r => JSON.stringify(r)).join('\n')
    if (call.includes('/files')) return `${JSON.stringify({ filename: 'a.ts', patch: '@@ -0,0 +1,2 @@\n+x\n+y' })}\n`
    if (call.startsWith('pr diff')) return 'the diff'
    throw new Error('not here')
  }
  return { gh, created }
}

function setup(items: InboxItem[], config: Partial<InboxConfig>, gh: Gh, reviewer: Reviewer, start?: AutoReviewFile) {
  let now = Date.parse('2026-11-10T09:00:00Z')
  let auto = start
  const runsDir = mkdtempSync(join(tmpdir(), 'review-inbox-runs-'))
  const tick = createAutoReview({
    gh,
    env: async () => ({}),
    config: async () => ({ ...DEFAULT_CONFIG, autoReview: true, settleMinutes: 0, ...config }),
    loadInbox: async () => ({ items, fetchedAt: now }),
    loadAuto: async () => auto,
    saveAuto: async (_, file) => void (auto = structuredClone(file)),
    runsDir,
    reviewer,
    now: () => now,
    language: 'en',
  })
  return { tick, auto: () => auto!, runsDir, later: (ms: number) => (now += ms) }
}

// A reviewer that answers `answer` and keeps what it was handed, with the diff it found in its folder.
function reviewerSaying(answer: { answer: string } | { error: string } = { answer: ANSWER }) {
  const runs: { prompt: string; provider: string; diff: string; folder: string }[] = []
  const reviewer: Reviewer = async run => {
    runs.push({ prompt: run.prompt, provider: run.provider, diff: readFileSync(join(run.folder, 'pr.diff'), 'utf8'), folder: run.folder })
    return answer
  }
  return { reviewer, runs }
}

test('a review request whose commits settled is reviewed once, and the answer becomes my pending review on its head', async () => {
  const { gh, created } = github()
  const { reviewer, runs } = reviewerSaying()
  const s = setup([item(1)], { reviewer: 'codex/gpt-5.5', skills: 'review-playbook' }, gh, reviewer)
  await s.tick()
  await s.tick()

  assert.equal(runs.length, 1)
  assert.equal(runs[0]!.diff, 'the diff')
  assert.equal(runs[0]!.provider, 'codex/gpt-5.5')
  assert.match(runs[0]!.prompt, /Review u1: "PR 1" by ann, head commit head1/)
  assert.match(runs[0]!.prompt, /load and follow these skills: review-playbook/)
  assert.equal(existsSync(runs[0]!.folder), false)
  assert.equal(created.length, 1)
  assert.equal(created[0]!.input.commit_id, 'head1')
  assert.deepEqual(created[0]!.input.comments.map(c => [c.path, c.line]), [['a.ts', 1]])
  const job = s.auto().jobs['o/r#1']!
  assert.equal(job.status, 'done')
  assert.equal(job.reviewId, 77)
  assert.equal(job.result?.summary, 'Reads fine')
})

test('with auto review off nothing is read or started', async () => {
  const { gh, created } = github()
  const { reviewer, runs } = reviewerSaying()
  const s = setup([item(1)], { autoReview: false }, gh, reviewer)
  await s.tick()
  assert.equal(runs.length + created.length, 0)
})

test('the daily limit holds the next review until the next day, oldest request first', async () => {
  const { gh } = github()
  const { reviewer, runs } = reviewerSaying()
  const s = setup([item(2), item(1)], { daily: 1 }, gh, reviewer)
  await s.tick()
  await s.tick()
  assert.deepEqual(runs.map(r => /Review (u\d)/.exec(r.prompt)![1]), ['u1'])
  assert.equal(s.auto().started, 1)

  s.later(DAY)
  await s.tick()
  assert.deepEqual(runs.map(r => /Review (u\d)/.exec(r.prompt)![1]), ['u1', 'u2'])
})

test('a head I already reviewed, or with my pending review, is left alone without a model call', async () => {
  const { gh, created } = github({ 1: [{ id: 5, state: 'COMMENTED', commit_id: 'head1', login: 'me' }], 2: [{ id: 6, state: 'PENDING', commit_id: 'head2', login: 'Me' }] })
  const { reviewer, runs } = reviewerSaying()
  const s = setup([item(1), item(2)], {}, gh, reviewer)
  await s.tick()
  await s.tick()
  assert.equal(runs.length + created.length, 0)
  assert.equal(s.auto().jobs['o/r#1']!.status, 'done')
  assert.equal(s.auto().jobs['o/r#2']!.reviewId, 6)
  assert.equal(s.auto().started ?? 0, 0)
})

test('a reviewer that fails is tried once more, then the job keeps why', async () => {
  const { gh, created } = github()
  const { reviewer, runs } = reviewerSaying({ error: 'the reviewer stopped (error)' })
  const s = setup([item(1)], {}, gh, reviewer)
  for (let i = 0; i < 3; i++) await s.tick()
  assert.equal(runs.length, 2)
  assert.equal(created.length, 0)
  assert.equal(s.auto().jobs['o/r#1']!.status, 'failed')
  assert.equal(s.auto().jobs['o/r#1']!.error, 'the reviewer stopped (error)')
})

test('a PR whose last commit is newer than the wait is not reviewed yet', async () => {
  const { gh } = github()
  const { reviewer, runs } = reviewerSaying()
  const s = setup([item(1, { headCommittedAt: '2026-11-10T08:50:00Z' })], { settleMinutes: 30 }, gh, reviewer)
  await s.tick()
  assert.equal(runs.length, 0)
  s.later(20 * 60_000)
  await s.tick()
  assert.equal(runs.length, 1)
})

test('a review the daemon left running when it stopped starts again', async () => {
  const { gh } = github()
  const { reviewer, runs } = reviewerSaying()
  const left: AutoReviewFile = { jobs: { 'o/r#1': { headSha: 'head1', firstSeenAt: 0, status: 'running', startedAt: 1 } } }
  const s = setup([item(1)], {}, gh, reviewer, left)
  await s.tick()
  assert.equal(runs.length, 1)
  assert.equal(s.auto().jobs['o/r#1']!.status, 'done')
})

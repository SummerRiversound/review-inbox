import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Gh, Summarizer } from '../shared/fetch'
import { RETRY_MS } from '../shared/inbox'
import { DEFAULT_CONFIG, type InboxConfig } from '../shared/settings'
import type { InboxFile } from '../shared/types'
import { reviewGroups, toView, workGroups } from '../shared/view'

const NONE = { auto: {}, hidden: {}, notifies: false }
import { ghEnv } from '../server/gh'
import { createSync } from '../server/sync'

const page = (nodes: unknown[]) => JSON.stringify({ viewer: { login: 'me' }, search: { pageInfo: { hasNextPage: false }, nodes } })
const reviewPr = {
  repository: { nameWithOwner: 'o/r' }, number: 7, title: 'Add search', url: 'u7', isDraft: false, createdAt: '2026-11-01T00:00:00Z',
  body: '', additions: 1, deletions: 0, changedFiles: 1, headRefOid: 'h7', author: { __typename: 'User', login: 'ann' },
  files: { nodes: [] }, reviewRequests: { nodes: [] }, reviews: { nodes: [] }, timelineItems: { nodes: [] },
}
const myPr = {
  repository: { nameWithOwner: 'o/r' }, number: 1, title: 'Mine', url: 'u1', isDraft: false, createdAt: '2026-11-01T00:00:00Z',
  reviewDecision: null, mergeable: 'MERGEABLE', commits: { nodes: [] }, reviews: { nodes: [] },
}
const issue = { repository: { nameWithOwner: 'o/r' }, number: 3, title: 'Broken', url: 'u3', updatedAt: '2026-11-02T00:00:00Z' }

// gh answering each search by its query; `calls` holds each call's arguments and GH_TOKEN.
function fakeGh(fail = false) {
  const calls: { args: string; token?: string }[] = []
  const gh: Gh = async (args, env) => {
    calls.push({ args: args.join(' '), token: env.GH_TOKEN })
    if (args[0] === 'auth') return 'tok\n'
    if (fail) throw new Error('offline')
    const q = args.join(' ')
    if (q.includes('review-requested:@me')) return page([reviewPr])
    if (q.includes('author:@me')) return page([myPr])
    if (q.includes('assignee:@me')) return page([issue])
    return page([])
  }
  return { gh, calls }
}

// The summaries a fetch writes are the titles, so the lists are checked without a model.
const titleOnly: Summarizer = { summary: async hit => ({ summary: hit.title, why: '', impact: [] }), since: async () => undefined }

function setup(gh: Gh, config: InboxConfig = DEFAULT_CONFIG) {
  let now = 1_000_000
  const files = new Map<string, InboxFile>()
  const key = (c: InboxConfig) => `${c.githubUser}|${c.scope}`
  const sync = createSync({
    gh,
    env: user => ghEnv(gh, user),
    summarizer: () => titleOnly,
    config: async () => config,
    load: async c => files.get(key(c)),
    save: async (c, f) => void files.set(key(c), f),
    now: () => now,
    refreshMs: 600_000,
  })
  return { ...sync, file: () => files.get(key(config)), tick: (ms: number) => (now += ms) }
}

test('a fetch fills the three lists the panel shows', async () => {
  const { gh } = fakeGh()
  const s = setup(gh)
  await s.sync()
  const view = toView(s.file(), false, NONE)
  assert.equal(view.status, 'ready')
  assert.deepEqual(reviewGroups(view).direct.map(i => [i.repo, i.number, i.author]), [['o/r', 7, 'ann']])
  const work = workGroups(view)
  assert.deepEqual(work.prs.map(pr => pr.number), [1])
  assert.deepEqual(work.issues.map(i => [i.number, i.kind]), [[3, 'assigned']])
})

test('GitHub is read again only once the refresh interval passed, or on a refresh', async () => {
  const { gh, calls } = fakeGh()
  const s = setup(gh)
  await s.sync()
  const first = calls.length
  s.tick(60_000)
  await s.sync()
  assert.equal(calls.length, first)
  await s.sync(true)
  assert.ok(calls.length > first)
  const second = calls.length
  s.tick(600_000)
  await s.sync()
  assert.ok(calls.length > second)
})

test('calls made while a fetch runs join it', async () => {
  const single = fakeGh()
  await setup(single.gh).sync(true)
  const { gh, calls } = fakeGh()
  const s = setup(gh)
  await Promise.all([s.sync(true), s.sync(true), s.sync(true)])
  assert.equal(calls.length, single.calls.length)
})

test('a failed fetch keeps the last lists, says why, and retries in a minute', async () => {
  let fail = false
  const { gh } = fakeGh()
  const s = setup((args, env) => (fail ? fakeGh(true).gh(args, env) : gh(args, env)))
  await s.sync()
  fail = true
  await s.sync(true)
  const file = s.file()!
  assert.equal(file.error, 'offline')
  assert.equal(file.items.length, 1)
  assert.ok(file.retryAt !== undefined && file.retryAt - 1_000_000 <= RETRY_MS)
  assert.equal(toView(file, false, NONE).status, 'error')
  fail = false
  s.tick(RETRY_MS)
  await s.sync()
  assert.equal(s.file()!.error, undefined)
})

test('a named account reads GitHub with that login’s token', async () => {
  const { gh, calls } = fakeGh()
  const s = setup(gh, { ...DEFAULT_CONFIG, scope: 'org:o', githubUser: 'me-work' })
  await s.sync()
  assert.equal(calls[0]!.args, 'auth token -u me-work')
  const searches = calls.filter(c => c.args.startsWith('api graphql'))
  assert.ok(searches.length >= 4)
  assert.ok(searches.every(c => c.token === 'tok' && c.args.includes('org:o')))
})

test('a fetch running shows as loading, and nothing fetched yet as empty', () => {
  assert.equal(toView(undefined, false, NONE).status, 'empty')
  assert.equal(toView(undefined, true, NONE).status, 'loading')
})

test('a first fetch that fails shows why, never empty lists as if GitHub had none', async () => {
  const s = setup(fakeGh(true).gh)
  await s.sync()
  const view = toView(s.file(), false, NONE)
  assert.equal(view.status, 'error')
  assert.equal(view.error, 'offline')
  assert.equal(view.fetchedAt, null)
})

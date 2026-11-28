import assert from 'node:assert/strict'
import { test } from 'node:test'
import { announce, type Notice } from '../server/notify'
import { DEFAULT_CONFIG } from '../shared/settings'
import { issueHide, prHide } from '../shared/tabs'
import type { InboxFile, InboxItem, IssueItem, MyPr } from '../shared/types'
import { reviewGroups, sidebarCount, workGroups } from '../shared/view'

const item = (n: number, over: Partial<InboxItem> = {}): InboxItem => ({
  repo: 'o/r', number: n, title: `PR ${n}`, url: `u${n}`, headSha: `h${n}`, author: 'ann', createdAt: '2026-11-01T00:00:00Z',
  requestedAt: '2026-11-01T00:00:00Z', isDraft: false, files: 1, additions: 1, deletions: 0, summary: `S${n}`, why: '', impact: [], isRerequest: false, ...over,
})
const pr = (n: number, state: MyPr['state']): MyPr => ({ repo: 'o/r', number: n, title: `Mine ${n}`, url: `m${n}`, createdAt: '2026-11-01T00:00:00Z', state, ciPending: false, newReviews: [] })
const issue = (n: number, kind: IssueItem['kind']): IssueItem => ({ kind, repo: 'o/r', number: n, title: `Issue ${n}`, url: `i${n}`, at: '2026-11-02T00:00:00Z' })

test('review requests group as the mod groups them, and a hidden one stays out until its head moves', () => {
  const items = [item(1), item(2, { team: 'platform' }), item(3, { isDraft: true }), item(4)]
  const hidden = { 'o/r#4': 'h4' }
  const g = reviewGroups({ items, hidden })
  assert.deepEqual([g.direct, g.team, g.drafts].map(list => list.map(i => i.number)), [[1], [2], [3]])
  assert.equal(g.hidden, 1)
  assert.equal(sidebarCount({ items, hidden }), 2)
  assert.deepEqual(reviewGroups({ items: [item(4, { headSha: 'new' })], hidden }).direct.map(i => i.number), [4])
})

test('my work splits my PRs, my issues and mentions of my work, without what I hid', () => {
  const hiddenPr = pr(2, 'changes')
  const hiddenIssue = issue(6, 'mention')
  const hidden = Object.fromEntries([prHide(hiddenPr, Date.now()), issueHide(hiddenIssue)])
  const g = workGroups({ mine: [pr(1, 'waiting'), hiddenPr], issues: [issue(5, 'assigned'), hiddenIssue, issue(7, 'reference')], hidden })
  assert.deepEqual(g.prs.map(p => p.number), [1])
  assert.deepEqual(g.issues.map(i => i.number), [5])
  assert.deepEqual(g.references.map(i => i.number), [7])
  assert.equal(g.hidden, 2)
})

test('a new review request is announced once, drafts only once ready, and the first fetch announces nothing', async () => {
  let seen: string[] | undefined
  const sent: Notice[] = []
  const store = { load: async () => seen, save: async (_: unknown, keys: string[]) => void (seen = keys) }
  const run = (items: InboxItem[]) => announce(DEFAULT_CONFIG, { items, fetchedAt: 1 } satisfies InboxFile, store, async n => void sent.push(n), (repo, n) => `New · ${repo} #${n}`)

  await run([item(1)])
  assert.equal(sent.length, 0)
  await run([item(1), item(2), item(3, { isDraft: true })])
  assert.deepEqual(sent.map(n => n.title), ['New · o/r #2'])
  assert.equal(sent[0]!.body, 'ann · S2')
  await run([item(1), item(2), item(3)])
  assert.deepEqual(sent.map(n => n.title), ['New · o/r #2', 'New · o/r #3'])
  await run([item(1), item(2), item(3)])
  assert.equal(sent.length, 2)
})

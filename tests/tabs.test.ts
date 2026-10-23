import { expect, test } from 'claude-code/testing'

import type { IssueItem, MyPr } from '../types'
import type { GqlMyPr, GqlReferenced, GqlTouched } from '../hooks/tabs'
import { MESSAGES } from '../hooks/i18n'
import { INBOX_QUERY } from '../hooks/inbox'
import { STYLE_QUERY } from '../hooks/style'
import {
  bandCounts, bandLabels, droppedCounts, issueAlerts, issueHide, issueKey, isIssueHidden, isPrHidden, prAlertText, prHide, prAlerts, prSeenKeys, referencesQuery, REFERENCES_QUERY, TAB_QUERIES, tabQueries, taskOf, taskPrompts, toIssues, toMyPrs, toReferences,
} from '../hooks/tabs'

type Review = GqlMyPr['reviews']['nodes'][number]
// My latest commit in these fixtures is from 2026-10-05.
const review = (login: string, submittedAt: string | null = '2026-10-06T00:00:00Z', state = 'COMMENTED'): Review =>
  ({ state, submittedAt, author: { login } })

const gqlPr = (over: Partial<GqlMyPr> & { ci?: string }): GqlMyPr => ({
  repository: { nameWithOwner: 'o/r' }, number: 1, title: 't', url: `u${over.number ?? 1}`,
  isDraft: false, createdAt: '2026-10-01T00:00:00Z', reviewDecision: null, mergeable: 'MERGEABLE',
  commits: { nodes: [{ commit: { committedDate: '2026-10-05T00:00:00Z', statusCheckRollup: over.ci ? { state: over.ci } : null } }] },
  reviews: { nodes: [] },
  ...over,
})

const touched = (url: string, updatedAt: string): GqlTouched =>
  ({ repository: { nameWithOwner: 'o/r' }, number: 1, title: 't', url, updatedAt })

const myPr = (state: MyPr['state'], url = 'u', newReviews: MyPr['newReviews'] = []): MyPr =>
  ({ repo: 'o/r', number: 1, title: 't', url, createdAt: '2026-10-01T00:00:00Z', state, ciPending: false, newReviews })

test('my PRs put what needs me first: changes requested, CI failing, conflict, then waiting, approved, drafts', async () => {
  const prs = toMyPrs([
    gqlPr({ number: 1, isDraft: true, reviewDecision: 'CHANGES_REQUESTED' }),
    gqlPr({ number: 2, reviewDecision: 'APPROVED' }),
    gqlPr({ number: 3, mergeable: 'UNKNOWN' }),
    gqlPr({ number: 4, mergeable: 'CONFLICTING' }),
    gqlPr({ number: 5, ci: 'FAILURE', mergeable: 'CONFLICTING' }),
    gqlPr({ number: 7, ci: 'ERROR' }),
    gqlPr({ number: 6, reviewDecision: 'CHANGES_REQUESTED', ci: 'FAILURE' }),
  ], 'me')
  expect(prs.map(p => [p.number, p.state])).toEqual([
    [6, 'changes'], [5, 'ci-failing'], [7, 'ci-failing'], [4, 'conflict'], [3, 'waiting'], [2, 'approved'], [1, 'draft'],
  ])
})

test('the oldest waiting PR comes first, and running CI is shown alongside the state', async () => {
  const prs = toMyPrs([
    gqlPr({ number: 1, createdAt: '2026-10-05T00:00:00Z', ci: 'PENDING' }),
    gqlPr({ number: 2, createdAt: '2026-09-01T00:00:00Z' }),
    gqlPr({ number: 3, createdAt: '2026-10-06T00:00:00Z', ci: 'EXPECTED' }),
  ], 'me')
  expect(prs.map(p => [p.number, p.ciPending])).toEqual([[2, false], [1, true], [3, true]])
})

test('an issue both assigned to me and mentioning me shows once, as assigned', async () => {
  const issues = toIssues(
    [touched('a', '2026-10-01T00:00:00Z')],
    [touched('a', '2026-10-01T00:00:00Z'), touched('m', '2026-10-03T00:00:00Z')],
    [],
  )
  expect(issues.map(i => [i.url, i.kind])).toEqual([['m', 'mention'], ['a', 'assigned']])
})

test('references to my work leave out the ones I made, newest first, capped at twenty', async () => {
  const event = (n: number, login: string | null) => ({
    createdAt: `2026-10-${String(n).padStart(2, '0')}T00:00:00Z`,
    actor: login === null ? null : { login },
    source: { repository: { nameWithOwner: 'o/x' }, number: n, title: `s${n}`, url: `s${n}` },
  })
  const target: GqlReferenced = {
    repository: { nameWithOwner: 'o/r' }, number: 7,
    timelineItems: { nodes: [event(1, 'Me'), event(2, null), ...Array.from({ length: 25 }, (_, i) => event(i + 3, 'other'))] },
  }
  const refs = toIssues([], [], toReferences([target], 'me'))
  expect(refs.length).toBe(20)
  expect(refs[0]).toEqual({ kind: 'reference', repo: 'o/x', number: 27, title: 's27', url: 's27', at: '2026-10-27T00:00:00Z', by: 'other', target: 'o/r#7' })
  expect(refs.some(r => r.number === 1 || r.number === 2)).toBe(false)
})

test('a thread listed for me directly, or the same link seen twice, is not repeated as a reference', async () => {
  const ref = (url: string, target: string): IssueItem =>
    ({ kind: 'reference', repo: 'o/x', number: 1, title: 't', url, at: '2026-10-02T00:00:00Z', by: 'other', target })
  const issues = toIssues([], [touched('m', '2026-10-03T00:00:00Z')], [ref('m', 'o/r#1'), ref('x', 'o/r#1'), ref('x', 'o/r#1'), ref('x', 'o/r#2')])
  expect(issues.map(i => [i.kind, i.url, i.target])).toEqual([['mention', 'm', undefined], ['reference', 'x', 'o/r#1'], ['reference', 'x', 'o/r#2']])
})

test('the scope narrows every search, newest activity first, and references look back from the given day', async () => {
  expect(tabQueries('org:acme')).toEqual({
    mine: 'is:pr is:open author:@me sort:updated-desc org:acme',
    assigned: 'is:issue is:open assignee:@me sort:updated-desc org:acme',
    mentioned: 'is:open mentions:@me sort:updated-desc org:acme',
  })
  expect(referencesQuery('org:acme', '2026-09-07T00:00:00Z')).toBe('author:@me updated:>=2026-09-07 sort:updated-desc org:acme')
  expect(referencesQuery('', '2026-09-07T00:00:00Z')).toBe('author:@me updated:>=2026-09-07 sort:updated-desc')
})

test('the band counts only what needs me and leaves out zeros', async () => {
  const ref: IssueItem = { kind: 'reference', repo: 'o/r', number: 1, title: 't', url: 'r', at: '2026-10-01T00:00:00Z' }
  const quiet = bandCounts(0, [myPr('waiting'), myPr('approved')], [ref])
  expect(quiet).toEqual({ reviews: 0, prTodo: 0, issues: 0 })
  expect(bandLabels(quiet, MESSAGES.en)).toEqual([])
  const busy = bandCounts(2, [myPr('changes'), myPr('waiting')], [{ ...ref, kind: 'mention' }, ref])
  expect(bandLabels(busy, MESSAGES.ko)).toEqual(['리뷰 2', '내 PR 할 일 1', '내 이슈 1'])
  expect(bandLabels(busy, MESSAGES.en)).toEqual(['To review 2', 'My PRs to act on 1', 'My issues 1'])
  expect(bandLabels({ reviews: 0, prTodo: 3, issues: 0 }, MESSAGES.en)).toEqual(['My PRs to act on 3'])
})

test('a count from a search that had more than one page reads as at least that many', async () => {
  const counts = { reviews: 100, prTodo: 2, issues: 97 }
  expect(bandLabels(counts, MESSAGES.ko, { review: true, issues: true })).toEqual(['리뷰 100+', '내 PR 할 일 2', '내 이슈 97+'])
  expect(bandLabels(counts, MESSAGES.en)).toEqual(['To review 100', 'My PRs to act on 2', 'My issues 97'])
})

test('every search is paged by the same two variables and asks for its cursor', async () => {
  for (const query of [...Object.values(TAB_QUERIES), REFERENCES_QUERY, INBOX_QUERY, STYLE_QUERY]) {
    expect(query).toContain('$first: Int!, $after: String')
    expect(query).toContain('search(query: $q, type: ISSUE, first: $first, after: $after)')
    expect(query).toContain('pageInfo { hasNextPage endCursor }')
  }
})

test('a PR turning to needs-me is announced once, never on the first look', async () => {
  const before = [myPr('waiting', 'a'), myPr('changes', 'b')]
  const after = [myPr('ci-failing', 'a'), myPr('changes', 'b')]
  expect(prAlerts(undefined, after)).toEqual([])
  expect(prAlerts(prSeenKeys(before), after).map(a => a.pr.url)).toEqual(['a'])
  expect(prAlerts(prSeenKeys(after), after)).toEqual([])
})

test('a new assignment, mention or reference is announced once, never on the first look', async () => {
  const old: IssueItem = { kind: 'mention', repo: 'o/r', number: 1, title: 't', url: 'x', at: '2026-10-01T00:00:00Z' }
  const fresh: IssueItem = { ...old, kind: 'reference', url: 'y', target: 'o/r#2' }
  expect(issueAlerts(undefined, [old, fresh])).toEqual([])
  expect(issueAlerts([issueKey(old)], [old, fresh])).toEqual([fresh])
  expect(issueAlerts([issueKey(old), issueKey(fresh)], [old, fresh])).toEqual([])
})

test('a review submitted after my latest commit shows as new, bots and thread replies included, until I commit again', async () => {
  const [pr] = toMyPrs([
    gqlPr({
      reviews: {
        nodes: [
          review('kim', '2026-10-04T00:00:00Z'),
          review('Me'),
          review('review-bot'),
          review('lee', null, 'PENDING'),
          review('park', '2026-10-06T12:00:00Z', 'DISMISSED'),
          review('kim', '2026-10-07T00:00:00Z', 'APPROVED'),
        ],
      },
    }),
  ], 'me')
  expect(pr!.newReviews).toEqual([
    { by: 'review-bot', at: '2026-10-06T00:00:00Z' },
    { by: 'kim', at: '2026-10-07T00:00:00Z' },
  ])
})

test('a waiting PR with a new review counts as something to do and comes before quiet ones', async () => {
  const prs = toMyPrs([
    gqlPr({ number: 1, createdAt: '2026-09-01T00:00:00Z' }),
    gqlPr({ number: 2, createdAt: '2026-10-05T00:00:00Z', reviews: { nodes: [review('kim')] } }),
  ], 'me')
  expect(prs.map(p => p.number)).toEqual([2, 1])
  expect(bandCounts(0, prs, []).prTodo).toBe(1)
})

test('new reviewers are announced once per review, never on the first look', async () => {
  const first = [myPr('waiting', 'a', [{ by: 'review-bot', at: '1' }])]
  const later = [myPr('waiting', 'a', [{ by: 'review-bot', at: '1' }, { by: 'kim', at: '2' }, { by: 'kim', at: '3' }])]
  expect(prAlerts(undefined, later)).toEqual([])
  expect(prAlerts(prSeenKeys(first), later).map(a => [a.pr.url, a.by])).toEqual([['a', 'kim']])
  expect(prAlerts(prSeenKeys(later), later)).toEqual([])
})

test('a review that also turns my PR to changes requested is one toast, not two', async () => {
  const before = [myPr('waiting', 'a')]
  const after = [{ ...myPr('changes', 'a', [{ by: 'kim', at: '1' }]), repo: 'o/r', number: 5 }]
  const alerts = prAlerts(prSeenKeys(before), after)
  const { en, ko } = MESSAGES
  expect(alerts.map(a => prAlertText(a, ko))).toEqual(['내 PR 변경 요청 · 새 리뷰 kim · o/r #5'])
  expect(prAlertText({ pr: after[0]!, turned: false, by: 'review-bot' }, ko)).toBe('내 PR 새 리뷰 · review-bot · o/r #5')
  expect(prAlertText({ pr: after[0]!, turned: true }, ko)).toBe('내 PR 변경 요청 · o/r #5')
  expect(alerts.map(a => prAlertText(a, en))).toEqual(['My PR: Changes requested · new review kim · o/r #5'])
  expect(prAlertText({ pr: after[0]!, turned: false, by: 'review-bot' }, en)).toBe('New review on my PR · review-bot · o/r #5')
})

test('a hidden PR of mine comes back when it turns to another state or gets a review after the hide', async () => {
  const pr = myPr('changes', 'a', [{ by: 'kim', at: '2026-10-06T00:00:00Z' }])
  const [key, mark] = prHide(pr, Date.parse('2026-10-07T00:00:00Z'))
  const hidden = { [key]: mark }
  expect(isPrHidden(hidden, pr)).toBe(true)
  // My own push clears the new reviews; that alone is no reason to show it again.
  expect(isPrHidden(hidden, { ...pr, newReviews: [] })).toBe(true)
  expect(isPrHidden(hidden, { ...pr, state: 'waiting' })).toBe(false)
  expect(isPrHidden(hidden, { ...pr, newReviews: [{ by: 'lee', at: '2026-10-08T00:00:00Z' }] })).toBe(false)
  expect(isPrHidden(hidden, myPr('changes', 'b'))).toBe(false)
})

test('a hidden issue comes back once it has new activity', async () => {
  const issue: IssueItem = { kind: 'mention', repo: 'o/r', number: 1, title: 't', url: 'x', at: '2026-10-01T00:00:00Z' }
  const hidden = Object.fromEntries([issueHide(issue)])
  expect(isIssueHidden(hidden, issue)).toBe(true)
  expect(isIssueHidden(hidden, { ...issue, at: '2026-10-02T00:00:00Z' })).toBe(false)
  expect(isIssueHidden(hidden, { ...issue, kind: 'assigned' })).toBe(false)
})

test('my PR keeps its branch, so a session checked out on it can be found', async () => {
  const [pr] = toMyPrs([gqlPr({ headRefName: 'feat/x' })], 'me')
  expect(pr!.branch).toBe('feat/x')
})

test('my PRs and issues keep their description for search', async () => {
  const [pr] = toMyPrs([gqlPr({ body: 'callback lost its query' })], 'me')
  expect(pr!.body).toBe('callback lost its query')
  const issues = toIssues([{ ...touched('a', '2026-10-01T00:00:00Z'), body: 'steps to reproduce' }], [touched('m', '2026-10-02T00:00:00Z')], [])
  expect(issues.map(i => i.body)).toEqual([undefined, 'steps to reproduce'])
})

test('a PR stuck on me, or an issue assigned to me, has a next step to hand to Claude; the rest have none', async () => {
  expect(taskOf(myPr('changes'))).toBe('changes')
  expect(taskOf(myPr('ci-failing'))).toBe('ci-failing')
  expect(taskOf(myPr('conflict'))).toBe('conflict')
  for (const state of ['waiting', 'approved', 'draft'] as const) expect(taskOf(myPr(state))).toBe(undefined)
  const issue = (kind: IssueItem['kind']): IssueItem => ({ kind, repo: 'o/r', number: 1, title: 't', url: 'u', at: '2026-10-01T00:00:00Z' })
  expect(taskOf(issue('assigned'))).toBe('work')
  expect(taskOf(issue('mention'))).toBe(undefined)
  expect(taskOf(issue('reference'))).toBe(undefined)
})

test('a task request names the PR, its next step and where to work, and a PR the draft already links is left out', async () => {
  const m = MESSAGES.en
  const conflict = { task: { kind: 'conflict' as const, repo: 'o/r', url: 'https://github.com/o/r/pull/1', base: 'develop' }, place: { kind: 'folder' as const, path: '/code/r' } }
  const issue = { task: { kind: 'work' as const, repo: 'o/i', url: 'https://github.com/o/i/issues/2' }, place: { kind: 'unknown' as const } }
  const ci = { task: { kind: 'ci-failing' as const, repo: 'o/r', url: 'https://github.com/o/r/pull/3' }, place: { kind: 'here' as const } }

  const text = taskPrompts('draft', [conflict, issue, ci], m)
  expect(text.startsWith('\n')).toBe(true)
  expect(text.trim().split('\n')).toHaveLength(6)
  expect(text).toContain('https://github.com/o/r/pull/1')
  expect(text).toContain('origin/develop')
  expect(text).toContain('/code/r')
  expect(text).toContain('gh repo clone o/i')
  expect(text).toContain('gh pr checks https://github.com/o/r/pull/3')
  expect(text).toContain(m.prompt.here)

  expect(taskPrompts('Look at https://github.com/o/r/pull/1', [conflict], m)).toBe('')
})

test('my PR turning approved with no CI running is announced once as ready to merge, never on the first look', async () => {
  const before = [myPr('waiting', 'a'), { ...myPr('approved', 'b'), ciPending: true }]
  const after = [{ ...myPr('approved', 'a'), number: 5 }, myPr('approved', 'b')]
  expect(prAlerts(undefined, after)).toEqual([])
  const alerts = prAlerts(prSeenKeys(before), after)
  expect(alerts.map(a => [a.pr.url, a.ready])).toEqual([['a', true], ['b', true]])
  expect(prAlertText(alerts[0]!, MESSAGES.en)).toBe('Ready to merge · o/r #5')
  expect(prAlerts(prSeenKeys(after), after)).toEqual([])
  // CI finishing alone, on a PR not yet approved, is not news.
  expect(prAlerts(prSeenKeys([{ ...myPr('waiting', 'c'), ciPending: true }]), [myPr('waiting', 'c')])).toEqual([])
})

test('a band count that goes down is picked out, one that rises, holds or reaches zero is not', async () => {
  const before = { reviews: 3, prTodo: 2, issues: 1 }
  expect(droppedCounts(undefined, before)).toEqual([])
  expect(droppedCounts(before, { reviews: 2, prTodo: 2, issues: 0 })).toEqual(['reviews'])
  expect(droppedCounts(before, { reviews: 4, prTodo: 1, issues: 1 })).toEqual(['prTodo'])
})

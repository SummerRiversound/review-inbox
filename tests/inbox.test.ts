import { expect, test } from 'claude-code/testing'

import type { InboxItem } from '../types'
import {
  REFRESH_MS, RETRY_MS, ageColor, cacheKey, searchQuery, failedSummary, requestedAt, shownReady, isHidden, reusableSummary, shouldFetch, lastReviewedSha, newArrivals, parseSummary, requestedVia, reviewPrompt, sortItems,
} from '../hooks/inbox'

const item = (over: Partial<InboxItem>): InboxItem => ({
  repo: 'r', number: 1, title: 't', url: 'u', headSha: 'h1', isRerequest: false, author: 'a', createdAt: '2026-10-01T00:00:00Z', requestedAt: '2026-10-01T00:00:00Z',
  isDraft: false, via: '직접 요청', files: 1, additions: 1, deletions: 0,
  summary: 's', why: 'w', impact: [], ...over,
})

test('a direct request wins over a team request on the same PR', async () => {
  expect(requestedVia([{ name: 'frontend' }, { login: 'Me' }], 'me')).toBe('직접 요청')
  expect(requestedVia([{ name: 'frontend', slug: 'frontend' }], 'me')).toBe('팀 요청 (frontend)')
})

test('direct requests come first, then the longest waiting', async () => {
  const sorted = sortItems([
    item({ number: 1, via: '팀 요청 (x)', requestedAt: '2026-01-01T00:00:00Z' }),
    item({ number: 2, requestedAt: '2026-10-05T00:00:00Z' }),
    item({ number: 3, requestedAt: '2026-07-01T00:00:00Z' }),
  ])
  expect(sorted.map(i => i.number)).toEqual([3, 2, 1])
})

test('waiting age maps to red after two weeks and yellow after three days', async () => {
  expect([ageColor(14), ageColor(3), ageColor(2)]).toEqual(['error', 'warning', 'subtle'])
})

test('a summary is read out of a reply that wraps the JSON in prose', async () => {
  const parsed = parseSummary('Here:\n{"summary":"a","why":"b","impact":[{"text":"c","warn":true},{"text":"d"}]}')
  expect(parsed).toEqual({ summary: 'a', why: 'b', impact: [{ text: 'c', warn: true }, { text: 'd', warn: false }] })
  expect(parseSummary('no json here')).toBeUndefined()
})

test('the review prompt carries the summary, the warnings and what changed since my review', async () => {
  const full = item({
    url: 'URL', summary: 'S',
    impact: [{ text: 'A', warn: true }, { text: 'B', warn: false }, { text: 'C', warn: true }],
    sinceLastReview: 'D',
  })
  expect(reviewPrompt('', full)).toBe('URL 리뷰해 줘.\n요약: S\n특히 확인할 점: A / C\n지난 내 리뷰 이후 바뀐 점: D\n')
  expect(reviewPrompt('먼저', item({ url: 'URL', summary: 'S' }))).toBe('\nURL 리뷰해 줘.\n요약: S\n')
})

test('my last review is the latest one I left, whoever else reviewed after', async () => {
  const reviews = [
    { author: { login: 'Me' }, commit: { oid: 'old' } },
    { author: { login: 'me' }, commit: { oid: 'new' } },
    { author: { login: 'other' }, commit: { oid: 'later' } },
    { author: null, commit: null },
    { state: 'PENDING', author: { login: 'me' }, commit: { oid: 'draft' } },
  ]
  expect(lastReviewedSha(reviews, 'me')).toBe('new')
  expect(lastReviewedSha([], 'me')).toBeUndefined()
})

test('a hidden PR comes back once it gets a new commit', async () => {
  expect(isHidden({ 'r#1': 'h1' }, item({}))).toBe(true)
  expect(isHidden({ 'r#1': 'h1' }, item({ headSha: 'h2' }))).toBe(false)
})

test('only PRs not seen before are announced, never on the first run or for drafts', async () => {
  const list = [item({ number: 1 }), item({ number: 2 }), item({ number: 3, isDraft: true })]
  expect(newArrivals(undefined, list)).toEqual([])
  expect(newArrivals(['r#1'], list).map(i => i.number)).toEqual([2])
})

test('only a session that finds the shared inbox stale and unclaimed goes to GitHub', async () => {
  const now = 1_000_000_000
  expect(shouldFetch({ items: [] }, now, false)).toBe(true)
  expect(shouldFetch({ items: [], mine: [], fetchedAt: now - 60_000 }, now, false)).toBe(false)
  expect(shouldFetch({ items: [], mine: [], fetchedAt: now - REFRESH_MS }, now, false)).toBe(true)
  expect(shouldFetch({ items: [], mine: [], fetchedAt: now - 60_000 }, now, true)).toBe(true)
  expect(shouldFetch({ items: [], fetchingSince: now - 60_000 }, now, true)).toBe(false)
  expect(shouldFetch({ items: [], fetchingSince: now - 6 * 60_000 }, now, false)).toBe(true)
})

test('a failed fetch is retried in a minute instead of after a full refresh', async () => {
  const now = 1_000_000_000
  expect(shouldFetch({ items: [], fetchedAt: now - 60_000, retryAt: now + RETRY_MS }, now, false)).toBe(false)
  expect(shouldFetch({ items: [], fetchedAt: now - 60_000, retryAt: now }, now, false)).toBe(true)
})

test('an unchanged PR keeps its summary; a failed one is retried three times, then kept', async () => {
  expect(reusableSummary(item({}), 'h1')).toEqual({ summary: 's', why: 'w', impact: [] })
  expect(reusableSummary(item({}), 'h2')).toBeUndefined()
  expect(reusableSummary(undefined, 'h1')).toBeUndefined()
  expect(reusableSummary(item({ summaryFailed: 2 }), 'h1')).toBeUndefined()
  expect(reusableSummary(item({ summaryFailed: 3 }), 'h1')?.summaryFailed).toBe(3)
  expect(failedSummary('t', 'api-error', item({ summaryFailed: 2 }), 'h1').summaryFailed).toBe(3)
  expect(failedSummary('t', 'api-error', item({ summaryFailed: 2 }), 'h2').summaryFailed).toBe(1)
})

test('a draft that becomes ready is announced then', async () => {
  const seen = shownReady([item({ number: 1, isDraft: true })])
  expect(newArrivals(seen, [item({ number: 1 })]).map(i => i.number)).toEqual([1])
})

test('waiting counts from the latest request to me or a team still on the PR, not from creation', async () => {
  const pr = (events: { createdAt: string; requestedReviewer: { login?: string; slug?: string } }[], teams: string[]) =>
    ({
      createdAt: '2026-08-01T00:00:00Z',
      reviewRequests: { nodes: teams.map(slug => ({ requestedReviewer: { slug } })) },
      timelineItems: { nodes: events },
    }) as unknown as Parameters<typeof requestedAt>[0]
  const events = [
    { createdAt: '2026-08-02T00:00:00Z', requestedReviewer: { login: 'Me' } },
    { createdAt: '2026-10-01T00:00:00Z', requestedReviewer: { login: 'other' } },
    { createdAt: '2026-09-01T00:00:00Z', requestedReviewer: { slug: 'fe' } },
  ]
  expect(requestedAt(pr(events, ['fe']), 'me')).toBe('2026-09-01T00:00:00Z')
  expect(requestedAt(pr(events, []), 'me')).toBe('2026-08-02T00:00:00Z')
  expect(requestedAt(pr([], []), 'me')).toBe('2026-08-01T00:00:00Z')
})

test('the configured scope narrows the base query, and empty means every repository', async () => {
  expect(searchQuery('')).toBe('is:pr is:open review-requested:@me')
  expect(searchQuery('  org:acme repo:me/tool ')).toBe('is:pr is:open review-requested:@me org:acme repo:me/tool')
})

test('each account and scope gets its own shared cache file', async () => {
  expect(cacheKey('', '')).toMatch(/^[0-9a-f]{8}$/)
  expect(cacheKey('', 'org:a')).toBe(cacheKey('', 'org:a'))
  expect(cacheKey('', 'org:a')).not.toBe(cacheKey('', 'org:b'))
  expect(cacheKey('me', 'org:a')).not.toBe(cacheKey('', 'org:a'))
})

test('a fresh file written by an older version of the mod, without the tabs, is refreshed', async () => {
  const now = 1_000_000_000
  expect(shouldFetch({ items: [], fetchedAt: now - 60_000 }, now, false)).toBe(true)
  expect(shouldFetch({ items: [], fetchedAt: now - 60_000, retryAt: now + RETRY_MS }, now, false)).toBe(false)
})

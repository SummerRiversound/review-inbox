import { expect, test } from 'claude-code/testing'

import type { InboxItem } from '../types'
import { MESSAGES } from '../hooks/i18n'
import {
  REFRESH_MS, RETRY_MS, ageColor, cacheKey, searchQuery, failedSummary, minutesSince, requestedAt, shownReady, isHidden, reusableSummary, shouldFetch, lastReviewedSha, newArrivals, parseSummary, requestedTeam, reviewPrompt, reviewPrompts, hasRequest, sinceRules, sortItems, summaryRules,
} from '../hooks/inbox'

const { en, ko } = MESSAGES

const item = (over: Partial<InboxItem>): InboxItem => ({
  repo: 'r', number: 1, title: 't', url: 'u', headSha: 'h1', isRerequest: false, author: 'a', createdAt: '2026-10-01T00:00:00Z', requestedAt: '2026-10-01T00:00:00Z',
  isDraft: false, files: 1, additions: 1, deletions: 0,
  summary: 's', why: 'w', impact: [], ...over,
})

test('a direct request wins over a team request on the same PR', async () => {
  expect(requestedTeam([{ name: 'frontend' }, { login: 'Me' }], 'me')).toBeUndefined()
  expect(requestedTeam([{ name: 'frontend', slug: 'frontend' }], 'me')).toBe('frontend')
})

test('direct requests come first, then the longest waiting', async () => {
  const sorted = sortItems([
    item({ number: 1, team: 'x', requestedAt: '2026-01-01T00:00:00Z' }),
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

test('the review prompt asks for the review with the warnings and what changed since my review, in the chosen language', async () => {
  const full = item({
    url: 'URL', summary: 'S',
    impact: [{ text: 'A', warn: true }, { text: 'B', warn: false }, { text: 'C', warn: true }],
    sinceLastReview: 'D',
  })
  expect(reviewPrompt('', full, ko)).toBe('URL 리뷰해 줘.\n특히 확인할 점: A / C\n지난 내 리뷰 이후 바뀐 점: D\n')
  expect(reviewPrompt('먼저', item({ url: 'URL', summary: 'S' }), ko)).toBe('\nURL 리뷰해 줘.\n')
  expect(reviewPrompt('', full, en)).toBe('Review URL.\nCheck in particular: A / C\nChanged since my last review: D\n')
})

test('my review style goes into the prompt once, however many PRs are added', async () => {
  const first = reviewPrompt('', item({ url: 'U1' }), en, 'Short and direct.')
  expect(first).toBe('Review U1.\nMy usual review style: Short and direct.\n')
  expect(reviewPrompt(first, item({ url: 'U2' }), en, 'Short and direct.')).toBe('Review U2.\n')
  expect(reviewPrompt('', item({ url: 'U1' }), en, undefined)).toBe('Review U1.\n')
})

test('the PRs added in the drawer go into the prompt together, the style once, none twice', async () => {
  const a = item({ url: 'https://github.com/o/r/pull/1' })
  const b = item({ url: 'https://github.com/o/r/pull/2' })
  expect(reviewPrompts('', [a, b], en, 'Short.')).toBe(
    'Review https://github.com/o/r/pull/1.\nMy usual review style: Short.\nReview https://github.com/o/r/pull/2.\n',
  )
  expect(reviewPrompts('Review https://github.com/o/r/pull/1.', [a, b], en, undefined)).toBe('\nReview https://github.com/o/r/pull/2.\n')
  expect(reviewPrompts('draft', [], en, 'Short.')).toBe('')
})

test('a PR counts as added only when the draft names its exact link', async () => {
  const url = 'https://github.com/o/r/pull/12'
  expect(hasRequest(reviewPrompt('', item({ url }), ko), url)).toBe(true)
  expect(hasRequest('Review https://github.com/o/r/pull/123.', url)).toBe(false)
  expect(hasRequest('Review https://github.com/o/r/pull/12/files', url)).toBe(false)
  expect(hasRequest('', url)).toBe(false)
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
  expect(failedSummary('t', 'api-error', item({ summaryFailed: 2 }), 'h1', en).summaryFailed).toBe(3)
  expect(failedSummary('t', 'api-error', item({ summaryFailed: 2 }), 'h2', en).summaryFailed).toBe(1)
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

test('summaries are cached per language, so a switch never reuses a summary written in the other one', async () => {
  expect(cacheKey('me', 'org:a', 'en')).not.toBe(cacheKey('me', 'org:a', 'ko'))
})

test('the model is asked for the chosen language and keeps the same JSON contract', async () => {
  for (const [rules, other] of [[summaryRules('en'), summaryRules('ko')], [summaryRules('ko'), summaryRules('en')]] as const) {
    expect(rules).toContain('Return only JSON: {"summary": string, "why": string, "impact": [{"text": string, "warn": boolean}]}')
    expect(rules).not.toBe(other)
  }
  expect(summaryRules('en')).toContain('Write in plain English')
  expect(summaryRules('en')).not.toContain('합니다체')
  expect(summaryRules('ko')).toContain('합니다체')
  expect(sinceRules('en')).toContain('Write in plain English')
  expect(sinceRules('ko')).toContain('합니다체')
})

test('a failed summary explains itself in the chosen language', async () => {
  expect(failedSummary('t', 'api-error', undefined, 'h1', en).why).toBe('Could not write a summary (api-error).')
  expect(failedSummary('t', 'api-error', undefined, 'h1', ko).why).toBe('요약을 만들지 못했습니다 (api-error).')
})

test('the status line counts whole minutes since the last fetch', async () => {
  const now = 1_000_000_000
  expect(minutesSince(undefined, now)).toBeUndefined()
  expect(minutesSince(now - 59_000, now)).toBe(0)
  expect(minutesSince(now - 5 * 60_000, now)).toBe(5)
  expect([en.status.updated(0), en.status.updated(5)]).toEqual(['Updated just now', 'Updated 5 min ago'])
  expect([ko.status.updated(0), ko.status.updated(5)]).toEqual(['방금 갱신', '5분 전 갱신'])
})

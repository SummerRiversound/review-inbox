import { expect, test } from 'claude-code/testing'

import type { GroupResult, SearchGroup } from '../types'
import { MESSAGES } from '../hooks/i18n'
import { GROUP_QUERY, MAX_GROUPS, bandSearchCount, groupQuery, resultOf, searchGroups, searchUrl, toHits } from '../hooks/searches'

const m = MESSAGES.en
const group = (over: Partial<SearchGroup>): SearchGroup => ({ id: 'g', name: 'G', query: 'org:acme', scope: 'prs', ...over })

test("a group's query gets its kind and newest first, unless it already says", () => {
  expect(groupQuery(group({}))).toBe('org:acme is:pr sort:updated-desc')
  expect(groupQuery(group({ scope: 'issues', query: ' label:bug ' }))).toBe('label:bug is:issue sort:updated-desc')
  expect(groupQuery(group({ query: 'type:issue org:acme sort:created-asc' }))).toBe('type:issue org:acme sort:created-asc')
  expect(groupQuery(group({ query: '(is:pr author:@me) OR assignee:@me' }))).toBe('(is:pr author:@me) OR assignee:@me sort:updated-desc')
  expect(searchUrl(group({ scope: 'issues', query: 'a b' }))).toBe('https://github.com/search?q=a%20b%20is%3Aissue%20sort%3Aupdated-desc&type=issues')
})

test('my groups follow the built-ins, replace or hide one by id, and past fifteen the rest are counted out', () => {
  const shown = searchGroups(m, [group({ id: 'involves-me', name: 'Mine instead' }), { ...group({ id: 'my-open-issues' }), hidden: true }, group({ id: 'team' })])
  expect(shown.groups.map(g => g.name)).toEqual(['Mine instead', 'Reviewed by me, still open', 'G'])
  expect(shown.extra).toBe(0)
  const many = searchGroups(m, Array.from({ length: 20 }, (_, i) => group({ id: `g${i}` })))
  expect(many.groups).toHaveLength(MAX_GROUPS)
  expect(many.extra).toBe(23 - MAX_GROUPS)
})

test('a result for an older query is not shown, and only groups counted in the band add to it', () => {
  const a = group({ id: 'a', countInBand: true })
  const b = group({ id: 'b' })
  const results: Record<string, GroupResult> = {
    a: { query: groupQuery(a), count: 3, hits: [] },
    b: { query: groupQuery(b), count: 9, hits: [] },
  }
  expect(bandSearchCount([a, b], results)).toBe(3)
  expect(resultOf({ ...a, query: 'org:other' }, results)).toBeUndefined()
  expect(bandSearchCount([{ ...a, query: 'org:other' }], results)).toBe(0)
})

test('hits keep repo, number, title, link, author and update time, and skip empty nodes', () => {
  const hits = toHits([
    {},
    { number: 4, title: 't', url: 'u', updatedAt: '2026-10-20T00:00:00Z', author: null, repository: { nameWithOwner: 'o/r' } },
  ])
  expect(hits).toEqual([{ repo: 'o/r', number: 4, title: 't', url: 'u', author: 'ghost', updatedAt: '2026-10-20T00:00:00Z' }])
  expect(GROUP_QUERY).toContain('issueCount')
  expect(GROUP_QUERY).toContain('search(query: $q, type: ISSUE, first: $first, after: $after)')
})

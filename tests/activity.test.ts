import { expect, test } from 'claude-code/testing'

import { hasNextPage, htmlUrl, isThreadHidden, notificationsPath, pollAfter, shownThreads, splitResponse, toThread } from '../hooks/activity'

const raw = (over: Partial<Parameters<typeof toThread>[0]> = {}) => ({
  id: '7',
  unread: true,
  reason: 'comment',
  updated_at: '2026-10-22T12:00:00Z',
  title: 'Fix it',
  url: 'https://api.github.com/repos/o/r/pulls/3',
  repo: 'o/r',
  ...over,
})

test("a subject's API URL becomes its page, and one without a URL opens the repository", () => {
  expect(htmlUrl('https://api.github.com/repos/o/r/pulls/3', 'o/r')).toBe('https://github.com/o/r/pull/3')
  expect(htmlUrl('https://api.github.com/repos/o/r/issues/4', 'o/r')).toBe('https://github.com/o/r/issues/4')
  expect(htmlUrl('https://api.github.com/repos/o/r/commits/abc123', 'o/r')).toBe('https://github.com/o/r/commit/abc123')
  expect(htmlUrl('https://api.github.com/repos/o/r/releases/99', 'o/r')).toBe('https://github.com/o/r/releases')
  expect(htmlUrl(null, 'o/r')).toBe('https://github.com/o/r')
})

test('gh api -i output splits into headers and body, with the next page, the poll interval and the window', () => {
  const text = 'HTTP/2.0 200 OK\r\nLast-Modified: Thu, 22 Oct 2026 12:51:50 GMT\r\nX-Poll-Interval: 60\r\nLink: <https://api.github.com/notifications?page=2>; rel="next"\r\n\r\n[{"id":"1"}]\n'
  const { headers, body } = splitResponse(text)
  expect(headers['last-modified']).toBe('Thu, 22 Oct 2026 12:51:50 GMT')
  expect(body).toBe('[{"id":"1"}]')
  expect(hasNextPage(headers)).toBe(true)
  expect(hasNextPage({})).toBe(false)
  expect(pollAfter(headers, 1_000)).toBe(61_000)
  expect(pollAfter({}, 1_000)).toBeUndefined()
  const now = Date.parse('2026-10-23T15:00:00Z')
  expect(notificationsPath(2, now)).toBe('notifications?all=true&participating=true&per_page=50&page=2&since=2026-09-23T00:00:00.000Z')
})

test('the tab leaves out threads that are cards elsewhere and reasons the other tabs cover, and links a CI run to Actions; Done hides until new activity', () => {
  const threads = [
    toThread(raw()),
    toThread(raw({ id: '8', url: 'https://api.github.com/repos/o/r/issues/5' })),
    toThread(raw({ id: '9', reason: 'review_requested', url: null })),
    toThread(raw({ id: '10', reason: 'security_alert', url: null })),
    toThread(raw({ id: '11', reason: 'something_new', url: null })),
    toThread(raw({ id: '12', reason: 'ci_activity', url: null })),
  ]
  expect(shownThreads(threads, new Set(['https://github.com/o/r/pull/3'])).map(t => t.id)).toEqual(['8', '10', '11', '12'])
  expect(threads[5]!.url).toBe('https://github.com/o/r/actions')
  const thread = threads[1]!
  expect(isThreadHidden({ 'thread:8': '2026-10-22T12:00:00Z' }, thread)).toBe(true)
  expect(isThreadHidden({ 'thread:8': '2026-10-22T12:00:00Z' }, { ...thread, updatedAt: '2026-10-23T09:00:00Z' })).toBe(false)
})

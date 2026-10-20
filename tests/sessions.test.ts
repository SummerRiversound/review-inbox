import { expect, test } from 'claude-code/testing'

import type { Presence } from '../types'
import { SESSION_STALE_MS, liveSessions, repoOf, workingOn } from '../hooks/sessions'

const at = Date.UTC(2026, 9, 20, 12)
const presence = (over: Partial<Presence>): Presence => ({ at, folder: 'review-inbox', remotes: [], prs: [], ...over })

test('a remote URL names its GitHub repository, over SSH or HTTPS', async () => {
  expect(repoOf('git@github.com:SummerRiversound/review-inbox.git')).toBe('SummerRiversound/review-inbox')
  expect(repoOf('https://github.com/o/r.git')).toBe('o/r')
  expect(repoOf('https://github.com/o/r')).toBe('o/r')
  expect(repoOf('ssh://git@github.com/o/r.git')).toBe('o/r')
  expect(repoOf('/local/path')).toBe(undefined)
})

test('a session that has not checked in for ten minutes is gone', async () => {
  const sessions = { a: presence({ at }), b: presence({ at: at - SESSION_STALE_MS - 1 }) }
  expect(Object.keys(liveSessions(sessions, at + 1_000))).toEqual(['a'])
})

test('a PR is in progress in the sessions on its branch, or that were asked about it', async () => {
  const pr = { repo: 'o/r', url: 'https://github.com/o/r/pull/12', branch: 'feat/x' }
  const sessions = {
    onBranch: presence({ folder: 'wt-x', branch: 'feat/x', remotes: ['o/r'] }),
    asked: presence({ folder: 'main', prs: ['https://github.com/o/r/pull/12'] }),
    otherRepo: presence({ folder: 'fork', branch: 'feat/x', remotes: ['o/other'] }),
    otherBranch: presence({ folder: 'wt-y', branch: 'feat/y', remotes: ['o/r'] }),
  }
  expect(workingOn(sessions, pr)).toEqual(['onBranch', 'asked'])
  // A review request has no branch of mine to match; only being asked about counts.
  expect(workingOn(sessions, { ...pr, branch: undefined })).toEqual(['asked'])
})

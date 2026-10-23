import { expect, test } from 'claude-code/testing'

import type { Presence } from '../types'
import { SESSION_STALE_MS, liveSessions, mainCheckout, placeOf, remember, repoOf, workingOn } from '../hooks/sessions'

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

test('a folder is remembered as its main checkout, so a worktree that goes away leaves a folder that stays', async () => {
  expect(mainCheckout('/Users/me/Develop/app/.git\n', '/Users/me')).toBe('/Users/me/Develop/app')
  expect(mainCheckout('C:/Users/me/app/.git', 'C:\\Users\\me')).toBe('C:/Users/me/app')
  // My home folder as a repository, a bare repository and no repository at all map nothing.
  expect(mainCheckout('/Users/me/.git', '/Users/me')).toBe(undefined)
  expect(mainCheckout('/srv/app.git', '/Users/me')).toBe(undefined)
  expect(mainCheckout('', '/Users/me')).toBe(undefined)
})

test('every GitHub remote of a folder points to it, and the newest folder wins', async () => {
  const before = { 'o/r': { path: '/old/r', at: at - 1 }, 'o/x': { path: '/x', at: at - 1 } }
  expect(remember(before, ['o/r', 'me/r'], '/code/r', at)).toEqual({
    'o/r': { path: '/code/r', at },
    'o/x': { path: '/x', at: at - 1 },
    'me/r': { path: '/code/r', at },
  })
})

test('work on a repository goes here when this session is in it, else to the folder remembered for it', async () => {
  const repos = { 'o/r': { path: '/code/r', at } }
  expect(placeOf('o/r', presence({ remotes: ['o/r'] }), repos)).toEqual({ kind: 'here' })
  expect(placeOf('o/r', presence({ remotes: ['o/x'] }), repos)).toEqual({ kind: 'folder', path: '/code/r' })
  expect(placeOf('o/z', undefined, repos)).toEqual({ kind: 'unknown' })
})

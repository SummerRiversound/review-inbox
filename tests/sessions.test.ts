import { expect, test } from 'claude-code/testing'

import type { Presence } from '../types'
import { SESSION_STALE_MS, hereFirst, isHere, liveSessions, mainCheckout, mappedPath, olderSessions, parseRepoPaths, placeOf, remember, repoOf, thisRepos, workingOn } from '../hooks/sessions'

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

test('this session\'s repositories are GH_REPO when set, else its folder\'s GitHub remotes', async () => {
  const self = presence({ remotes: ['me/r', 'o/r'] })
  expect(thisRepos(self, undefined)).toEqual(['me/r', 'o/r'])
  expect(thisRepos(self, 'acme/tool')).toEqual(['acme/tool'])
  expect(thisRepos(self, 'github.example.com/acme/tool')).toEqual(['acme/tool'])
  expect(thisRepos(undefined, '')).toEqual([])
})

test('cards from this session\'s repositories come first, in their own order, whatever the case of the name', async () => {
  const cards = [{ repo: 'a/x', n: 1 }, { repo: 'O/R', n: 2 }, { repo: 'a/y', n: 3 }, { repo: 'o/r', n: 4 }]
  expect(hereFirst(cards, ['o/r']).map(c => c.n)).toEqual([2, 4, 1, 3])
  expect(isHere('O/R', ['o/r'])).toBe(true)
})

test('the folders option maps an exact repository before an owner wildcard, with ~ as home and * as the name', async () => {
  const paths = parseRepoPaths(' o/r = ~/work/r , o/*=~/code/* , bad, =x, a/b= ')
  expect(paths).toEqual({ 'o/r': '~/work/r', 'o/*': '~/code/*' })
  expect(mappedPath('o/r', paths, '/home/me')).toBe('/home/me/work/r')
  expect(mappedPath('O/tool', paths, '/home/me')).toBe('/home/me/code/tool')
  expect(mappedPath('x/y', paths, '/home/me')).toBe(undefined)
})

test('a mapped folder wins over this session\'s folder and the remembered one', async () => {
  const self = presence({ remotes: ['o/r'] })
  expect(placeOf('o/r', self, { 'o/r': { path: '/old', at } }, '/mapped')).toEqual({ kind: 'folder', path: '/mapped' })
})

test('a session on an older release, or from before releases were written, is named by its folder; mine and newer ones are not', async () => {
  const sessions = {
    self: presence({ folder: 'me', version: '0.12.0' }),
    old: presence({ folder: 'dhub2', version: '0.9.0' }),
    unknown: presence({ folder: 'prevention_system' }),
    same: presence({ folder: 'web', version: '0.12.0' }),
    newer: presence({ folder: 'api', version: '0.12.10' }),
  }
  expect(olderSessions(sessions, 'self', '0.12.0')).toEqual(['dhub2', 'prevention_system'])
  expect(olderSessions(sessions, 'self', undefined)).toEqual([])
})

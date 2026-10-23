import { expect, test } from 'claude-code/testing'

import type { InboxItem, MyPr } from '../types'
import { canMerge, issueActions, prActions, reviewActions, writeArgs } from '../hooks/direct'

const pr = (more: Partial<MyPr>): MyPr =>
  ({ repo: 'o/r', number: 1, title: 't', url: 'u', createdAt: '2026-10-01T00:00:00Z', state: 'waiting', ciPending: false, newReviews: [], headSha: 'abc', ...more })

test('a card offers only the writes its state makes useful', () => {
  expect(prActions(pr({ state: 'draft' }))).toEqual(['ready'])
  expect(prActions(pr({ isBehind: true }))).toEqual(['update-branch'])
  expect(prActions(pr({ state: 'ci-failing', isBehind: true }))).toEqual(['update-branch', 'rerun'])
  expect(prActions(pr({ state: 'ci-failing', headSha: undefined }))).toEqual([])
  expect(prActions(pr({}))).toEqual([])
  expect(reviewActions({ isDraft: true } as InboxItem)).toEqual([])
  expect(reviewActions({ isDraft: false } as InboxItem)).toEqual(['approve'])
  expect(issueActions({ kind: 'mention' } as never)).toEqual(['assign'])
  expect(issueActions({ kind: 'assigned' } as never)).toEqual([])
  expect(canMerge(pr({ state: 'approved' }))).toBe(true)
  expect(canMerge(pr({ state: 'approved', ciPending: true }))).toBe(false)
})

test('an approve is pinned to the commit I looked at, and Update branch merges rather than rebases', () => {
  const target = { repo: 'o/r', number: 7, title: 't', sha: 'abc' }
  expect(writeArgs('approve', target, 'me')).toEqual(['api', '-X', 'POST', 'repos/o/r/pulls/7/reviews', '-f', 'event=APPROVE', '-f', 'commit_id=abc'])
  expect(writeArgs('update-branch', target, 'me')).toEqual(['api', '-X', 'PUT', 'repos/o/r/pulls/7/update-branch', '-f', 'expected_head_sha=abc'])
  expect(writeArgs('assign', target, 'me', true)).toEqual(['api', '-X', 'DELETE', 'repos/o/r/issues/7/assignees', '-f', 'assignees[]=me'])
})

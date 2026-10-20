import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { IssueItem, MyPr } from '../types'
import { cacheKey } from '../hooks/inbox'

const PANE = {
  plugin: 'review-inbox',
  component: 'Pane',
  requestId: 'review-inbox',
  surface: 'terminal',
  props: { title: 'Review inbox', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} },
} as const

const INBOX = `/home/me/.claude/plugins/data/review-inbox/inbox-${cacheKey('', '', 'en')}.json`

const pr = (number: number, state: MyPr['state'], body?: string): MyPr =>
  ({ repo: 'o/r', number, title: `t${number}`, url: `u${number}`, createdAt: '2026-10-01T00:00:00Z', state, ciPending: false, newReviews: [], ...(body ? { body } : {}) })
const issue = (number: number, kind: IssueItem['kind']): IssueItem =>
  ({ kind, repo: 'o/i', number, title: `i${number}`, url: `i${number}`, at: '2026-10-01T00:00:00Z' })

// A session whose shared file was just fetched, so it shows the lists without going to GitHub; mv is missing, so files are written in place.
async function opened($: Parameters<TestBody>[0], on: On, mine: MyPr[], issues: IssueItem[], tab: string) {
  const clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me' })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('ui.panes', async () => ({ value: [] }))
  on('command.register', async () => ({ value: { command: 'review-inbox' } }))
  const store = new Map([[INBOX, JSON.stringify({ items: [], mine, issues, fetchedAt: Date.now() })]])
  on('fs.exists', async ($, e) => ({ value: store.has(e.path) }))
  on('fs.read', async ($, e) => ({ value: store.get(e.path)! }))
  on('fs.write', async ($, e) => {
    store.set(e.path, e.text)
    return { value: undefined }
  })
  on('process.run', async () => {
    throw new Error('mv: command not found')
  })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  for (let i = 0; i < 6; i++) await clock.advance(1_000)
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: `tab-${tab}` })
  return ui
}

const shown = async (ui: { find: (q: { type: 'Text'; text: RegExp }) => Promise<unknown> }, text: RegExp) =>
  (await ui.find({ type: 'Text', text })) !== undefined

test('my PRs are grouped by state, and a group folds shut and opens again', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting')], [], 'mine')

  expect(await shown(ui, /#1/)).toBe(true)
  await ui.press({ key: 'fold-mine:changes' })
  expect(await shown(ui, /#1/)).toBe(false)
  expect(await shown(ui, /#2/)).toBe(true)
  await ui.press({ key: 'fold-mine:changes' })
  expect(await shown(ui, /#1/)).toBe(true)
  await ui.unmount()
})

test('a hidden PR of mine leaves its tab, and show all brings it back', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting')], [], 'mine')

  await ui.press({ key: 'hide-u1' })
  expect(await shown(ui, /#1/)).toBe(false)
  await ui.press({ key: 'unhide' })
  expect(await shown(ui, /#1/)).toBe(true)
  await ui.unmount()
})

test('my issues are split into assigned, mentions and references, and an issue can be hidden', async ($, on) => {
  const ui = await opened($, on, [], [issue(1, 'mention'), issue(2, 'assigned'), { ...issue(3, 'reference'), by: 'kim', target: 'o/r#9' }], 'issues')

  for (const key of ['fold-issues:assigned', 'fold-issues:mention', 'fold-issues:reference']) {
    expect(await ui.find({ key })).toBeDefined()
  }
  await ui.press({ key: 'hide-mention:i1:' })
  expect(await shown(ui, /#1/)).toBe(false)
  expect(await shown(ui, /#2/)).toBe(true)
  await ui.unmount()
})

test('a note shows above the title and stays after the drawer redraws', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine')

  await ui.press({ key: 'note-pr:u1' })
  await ui.input({ key: 'note-input-pr:u1', text: 'Friday with Kim', kind: 'change' })
  await ui.press({ key: 'note-save-pr:u1' })
  expect(await shown(ui, /Note: Friday with Kim/)).toBe(true)
  expect(await shown(ui, /#1/)).toBe(true)

  await ui.press({ key: 'note-clear-pr:u1' })
  expect(await shown(ui, /Note:/)).toBe(false)
  await ui.unmount()
})

test('a snoozed card leaves its tab with its note, and search still finds it, marked hidden', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting', 'The callback URL lost its query string')], [issue(3, 'assigned')], 'mine')

  await ui.press({ key: 'note-pr:u1' })
  await ui.input({ key: 'note-input-pr:u1', text: 'after the release', kind: 'change' })
  await ui.press({ key: 'note-tomorrow-pr:u1' })
  expect(await shown(ui, /#1/)).toBe(false)

  await ui.input({ key: 'search', text: 'release', kind: 'change' })
  expect(await shown(ui, /#1/)).toBe(true)
  expect(await shown(ui, /^hidden$/)).toBe(true)
  expect(await shown(ui, /#2/)).toBe(false)

  // The description is searched too, across every tab.
  await ui.input({ key: 'search', text: 'callback', kind: 'change' })
  expect(await shown(ui, /#2/)).toBe(true)
  expect(await shown(ui, /#1/)).toBe(false)

  await ui.input({ key: 'search', text: '', kind: 'change' })
  expect(await ui.find({ key: 'tab-review' })).toBeDefined()
  await ui.unmount()
})

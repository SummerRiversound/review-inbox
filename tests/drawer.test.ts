import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { InboxItem, IssueItem, MyPr, Presence } from '../types'
import { cacheKey } from '../hooks/inbox'

const PANE = {
  plugin: 'review-inbox',
  component: 'Pane',
  requestId: 'review-inbox',
  surface: 'terminal',
  props: { title: 'Review inbox', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} },
} as const

const INBOX = `/home/me/.claude/plugins/data/review-inbox/inbox-${cacheKey('', '', 'en')}.json`
const SESSIONS = '/home/me/.claude/plugins/data/review-inbox/sessions.json'
const REPOS = '/home/me/.claude/plugins/data/review-inbox/repos.json'

const pr = (number: number, state: MyPr['state'], body?: string): MyPr =>
  ({ repo: 'o/r', number, title: `t${number}`, url: `u${number}`, createdAt: '2026-10-01T00:00:00Z', state, ciPending: false, newReviews: [], ...(body ? { body } : {}) })
const issue = (number: number, kind: IssueItem['kind']): IssueItem =>
  ({ kind, repo: 'o/i', number, title: `i${number}`, url: `i${number}`, at: '2026-10-01T00:00:00Z' })

// The last opened session's files, as it wrote them.
let files = new Map<string, string>()

// A session whose shared file was just fetched, so it shows the lists without going to GitHub; mv is missing, so files are written in place.
async function opened(
  $: Parameters<TestBody>[0],
  on: On,
  mine: MyPr[],
  issues: IssueItem[],
  tab: string,
  more: { items?: InboxItem[]; sessions?: Record<string, Presence>; files?: Record<string, string>; env?: Record<string, string> } = {},
) {
  const clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me', ...more.env })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('session.id', async () => ({ value: 'self' }))
  on('session.cwd', async () => ({ value: '/work/review-inbox' }))
  on('ui.panes', async () => ({ value: [] }))
  on('command.register', async () => ({ value: { command: 'review-inbox' } }))
  const store = new Map([[INBOX, JSON.stringify({ items: more.items ?? [], mine, issues, fetchedAt: Date.now() })]])
  if (more.sessions) store.set(SESSIONS, JSON.stringify(more.sessions))
  for (const [path, text] of Object.entries(more.files ?? {})) store.set(path, text)
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
  files = store
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

const item = (number: number): InboxItem => ({
  repo: 'o/r', number, title: `r${number}`, url: `https://github.com/o/r/pull/${number}`, headSha: 'a', author: 'kim',
  createdAt: '2026-10-01T00:00:00Z', requestedAt: '2026-10-01T00:00:00Z', isDraft: false, files: 1, additions: 1, deletions: 0,
  summary: 's', why: '', impact: [], isRerequest: false,
})

test('my PR whose branch another session is on moves to in progress, named by that session\'s folder', async ($, on) => {
  const other: Presence = { at: Date.now(), folder: 'wt-x', branch: 'feat/x', remotes: ['o/r'], prs: [] }
  const ui = await opened($, on, [{ ...pr(1, 'changes'), branch: 'feat/x' }, pr(2, 'changes')], [], 'mine', { sessions: { other } })

  expect(await shown(ui, /wt-x/)).toBe(true)
  await ui.press({ key: 'fold-mine:session' })
  expect(await shown(ui, /#1/)).toBe(false)
  expect(await shown(ui, /#2/)).toBe(true)
  await ui.unmount()
})

test('a review request linked in this session\'s prompt moves to in progress here, and other sessions can see it', async ($, on) => {
  on('prompt.submit', async ($, e) => ({ text: e.text }))
  const ui = await opened($, on, [], [], 'review', { items: [item(5), item(6)] })

  await $.prompt.submit({ text: 'Review https://github.com/o/r/pull/5 please', wait: false, origin: { kind: 'composer' } })
  expect(await shown(ui, /this session/)).toBe(true)
  await ui.press({ key: 'fold-review:session' })
  expect(await shown(ui, /#5/)).toBe(false)
  expect(await shown(ui, /#6/)).toBe(true)

  const sessions = JSON.parse(files.get(SESSIONS)!) as Record<string, Presence>
  expect(Object.values(sessions).flatMap(s => s.prs)).toEqual(['https://github.com/o/r/pull/5'])
  await ui.unmount()
})

test('a stuck PR or an assigned issue has a button naming its next step and the folder it would be worked in; pressing it adds the card', async ($, on) => {
  const label = async (key: string) => (await ui.find({ key }))?.props.label
  const repos = { 'o/r': { path: '/home/me/code/r', at: Date.now() } }
  const ui = await opened($, on, [pr(1, 'conflict'), pr(2, 'waiting')], [issue(3, 'assigned'), issue(4, 'mention')], 'mine', {
    files: { [REPOS]: JSON.stringify(repos) },
  })

  expect(await label('task-u1')).toBe('Resolve conflict')
  expect(await shown(ui, /in ~\/code\/r/)).toBe(true)
  expect(await ui.find({ key: 'task-u2' })).toBe(undefined)
  await ui.press({ key: 'task-u1' })
  expect(await label('task-u1')).toBe('Added')

  await ui.press({ key: 'tab-issues' })
  expect(await label('task-i3')).toBe('Work on this')
  expect(await shown(ui, /no local clone/)).toBe(true)
  expect(await ui.find({ key: 'task-i4' })).toBe(undefined)
  await ui.unmount()
})

test('a session remembers the main checkout of each GitHub repository its folder holds', async ($, on) => {
  const clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me' })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('session.id', async () => ({ value: 'self' }))
  on('session.cwd', async () => ({ value: '/home/me/code/r/.claude/worktrees/x' }))
  on('ui.panes', async () => ({ value: [] }))
  on('command.register', async () => ({ value: { command: 'review-inbox' } }))
  const store = new Map<string, string>()
  on('fs.exists', async ($, e) => ({ value: store.has(e.path) }))
  on('fs.read', async ($, e) => ({ value: store.get(e.path)! }))
  on('fs.write', async ($, e) => {
    store.set(e.path, e.text)
    return { value: undefined }
  })
  const out = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
  on('process.run', async ($, e) => {
    const args = e.argv.join(' ')
    if (args.endsWith('remote -v')) return out('origin\tgit@github.com:me/r.git (fetch)\nupstream\thttps://github.com/o/r.git (fetch)\n')
    if (args.includes('--git-common-dir')) return out('/home/me/code/r/.git\n')
    if (args.endsWith('--show-current')) return out('feat/x\n')
    throw new Error('mv: command not found')
  })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  // Past the first sync too, which starts 1 to 5 seconds in: one still running when the test ends is aborted.
  for (let i = 0; i < 6; i++) await clock.advance(1_000)

  const repos = JSON.parse(store.get(REPOS)!) as Record<string, { path: string }>
  expect(Object.fromEntries(Object.entries(repos).map(([repo, r]) => [repo, r.path]))).toEqual({
    'me/r': '/home/me/code/r',
    'o/r': '/home/me/code/r',
  })
})

test('when the tabs mix repositories, this session\'s comes first and a button narrows the tab to it', async ($, on) => {
  const ui = await opened($, on, [{ ...pr(1, 'changes'), repo: 'x/y' }, pr(2, 'changes')], [], 'mine', { env: { GH_REPO: 'o/r' } })

  expect(await shown(ui, /this repo/)).toBe(true)
  await ui.press({ key: 'scope-here' })
  expect(await shown(ui, /#1/)).toBe(false)
  expect(await shown(ui, /#2/)).toBe(true)
  await ui.press({ key: 'scope-all' })
  expect(await shown(ui, /#1/)).toBe(true)
  await ui.unmount()
})

test('the scope buttons stay away when every card is from this session\'s repository', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine', { env: { GH_REPO: 'o/r' } })

  expect(await ui.find({ key: 'scope-here' })).toBeUndefined()
  expect(await shown(ui, /this repo/)).toBe(false)
  await ui.unmount()
})

test('nothing needing me shows the inbox-zero line', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'waiting')], [], 'mine')
  expect(await shown(ui, /Nothing needs you/)).toBe(true)
  await ui.unmount()
})

test('a PR to act on keeps the inbox-zero line away', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine')
  expect(await shown(ui, /Nothing needs you/)).toBe(false)
  await ui.unmount()
})

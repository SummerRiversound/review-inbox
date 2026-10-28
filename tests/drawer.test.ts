import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Activity, GroupResult, InboxItem, IssueItem, MyPr, Presence, Thread } from '../types'
import { contentKey, switchedOn } from '../hooks/autoreview'
import { INBOX_FORMAT, cacheKey } from '../hooks/inbox'
import { prSeenKeys } from '../hooks/tabs'

const PANE = {
  plugin: 'review-inbox',
  component: 'Pane',
  requestId: 'review-inbox',
  surface: 'terminal',
  props: { title: 'Review inbox', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} },
} as const

const INBOX = `/home/me/.claude/plugins/data/review-inbox/inbox-${cacheKey('', '', 'en')}-f${INBOX_FORMAT}.json`
// The name every release before formats were numbered reads and writes.
const LEGACY_INBOX = `/home/me/.claude/plugins/data/review-inbox/inbox-${cacheKey('', '', 'en')}.json`
const SESSIONS = '/home/me/.claude/plugins/data/review-inbox/sessions.json'
const RELOAD = '/home/me/.claude/plugins/data/review-inbox/reload.json'
const REPOS = '/home/me/.claude/plugins/data/review-inbox/repos.json'
const SHOWN = `/home/me/.claude/plugins/data/review-inbox/shown-${cacheKey('', '')}.json`

const pr = (number: number, state: MyPr['state'], body?: string): MyPr =>
  ({ repo: 'o/r', number, title: `t${number}`, url: `u${number}`, createdAt: '2026-10-01T00:00:00Z', state, ciPending: false, newReviews: [], ...(body ? { body } : {}) })
const issue = (number: number, kind: IssueItem['kind']): IssueItem =>
  ({ kind, repo: 'o/i', number, title: `i${number}`, url: `i${number}`, at: '2026-10-01T00:00:00Z' })

// The last opened session's files, as it wrote them, and its clock.
let files = new Map<string, string>()
let clock: ReturnType<typeof mock.clock>

// A session whose shared file was just fetched, so it shows the lists without going to GitHub; mv is missing, so files are written in place.
async function opened(
  $: Parameters<TestBody>[0],
  on: On,
  mine: MyPr[],
  issues: IssueItem[],
  tab: string,
  more: {
    items?: InboxItem[]
    sessions?: Record<string, Presence>
    files?: Record<string, string>
    env?: Record<string, string>
    groups?: Record<string, GroupResult>
    activity?: Activity
    // The version this session's plugin.json states.
    version?: string
    // Answers a command, joined by spaces; anything it leaves fails as if missing.
    run?: (args: string, stdin?: string) => { exitCode: number; stdout?: string; stderr?: string } | undefined
  } = {},
) {
  clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me', ...more.env })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('session.id', async () => ({ value: 'self' }))
  on('session.cwd', async () => ({ value: '/work/review-inbox' }))
  on('ui.panes', async () => ({ value: [] }))
  // Stands for the engine, which draws an empty row above the prompt when no plugin beneath the band draws there.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => h($.ui.resolve(e).Box, null))
  on('command.register', async () => ({ value: { command: 'review-inbox' } }))
  const store = new Map([[INBOX, JSON.stringify({ items: more.items ?? [], mine, issues, groups: more.groups ?? {}, activity: more.activity, fetchedAt: Date.now() })]])
  if (more.sessions) store.set(SESSIONS, JSON.stringify(more.sessions))
  for (const [path, text] of Object.entries(more.files ?? {})) store.set(path, text)
  on('fs.exists', async ($, e) => ({ value: store.has(e.path) }))
  on('fs.read', async ($, e) => {
    if (e.path.endsWith('/.claude-plugin/plugin.json') && more.version) return { value: JSON.stringify({ version: more.version }) }
    if (!store.has(e.path)) throw new Error(`ENOENT: ${e.path}`)
    return { value: store.get(e.path)! }
  })
  on('fs.write', async ($, e) => {
    store.set(e.path, e.text)
    return { value: undefined }
  })
  on('process.run', async ($, e) => {
    const answer = more.run?.(e.argv.join(' '), e.init?.stdin)
    if (!answer) throw new Error('mv: command not found')
    return { value: { exitCode: answer.exitCode, stdout: answer.stdout ?? '', stderr: answer.stderr ?? '', isStdoutTruncated: false, isStderrTruncated: false } }
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

test('a new session sums up in one toast what changed since the last session looked, and only once', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const last = { reviews: [], prs: prSeenKeys([pr(1, 'waiting')]), issues: [] }
  const ui = await opened($, on, [pr(1, 'ci-failing'), pr(2, 'waiting')], [], 'mine', { files: { [SHOWN]: JSON.stringify(last) } })

  expect(toasts).toEqual(['While you were away · CI failing 1'])
  expect(JSON.parse(files.get(SHOWN)!).prs).toEqual(prSeenKeys([pr(1, 'ci-failing'), pr(2, 'waiting')]))
  await clock.advance(30_000)
  expect(toasts).toHaveLength(1)
  await ui.unmount()
})

test('a hidden PR of mine leaves its tab, and show all brings it back', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting')], [], 'mine')

  await ui.press({ key: 'more-pr:u1' })
  await ui.press({ key: 'hide-u1' })
  expect(await shown(ui, /#1/)).toBe(false)
  await ui.press({ key: 'unhide' })
  expect(await shown(ui, /#1/)).toBe(true)
  await ui.unmount()
})

test('hiding a second PR keeps the first one hidden', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting'), pr(3, 'waiting')], [], 'mine')

  await ui.press({ key: 'more-pr:u1' })
  await ui.press({ key: 'hide-u1' })
  await ui.press({ key: 'more-pr:u2' })
  await ui.press({ key: 'hide-u2' })
  expect(await shown(ui, /#1/)).toBe(false)
  expect(await shown(ui, /#2/)).toBe(false)
  expect(await shown(ui, /#3/)).toBe(true)
  await ui.unmount()
})

test('my issues are split into assigned, mentions and references, and an issue can be hidden', async ($, on) => {
  const ui = await opened($, on, [], [issue(1, 'mention'), issue(2, 'assigned'), { ...issue(3, 'reference'), by: 'kim', target: 'o/r#9' }], 'issues')

  for (const key of ['fold-issues:assigned', 'fold-issues:mention', 'fold-issues:reference']) {
    expect(await ui.find({ key })).toBeDefined()
  }
  await ui.press({ key: 'more-issue:mention:i1:' })
  await ui.press({ key: 'hide-mention:i1:' })
  expect(await shown(ui, /#1/)).toBe(false)
  expect(await shown(ui, /#2/)).toBe(true)
  await ui.unmount()
})

test('a note shows above the title and stays after the drawer redraws', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine')

  await ui.press({ key: 'more-pr:u1' })
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

  await ui.press({ key: 'more-pr:u1' })
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

test('the tabs are pressed with 1 to 5 from the left, their names unnumbered, with a divider between the lists to act on and the ones to browse', async ($, on) => {
  const ui = await opened($, on, [], [], 'mine')
  const tab = async (key: string) => (await ui.find({ key }))?.props
  expect(await tab('tab-review')).toMatchObject({ hotkey: '1', label: 'To review 0' })
  expect(await tab('tab-issues')).toMatchObject({ hotkey: '3', label: 'Assigned & mentioned 0' })
  expect(await tab('tab-activity')).toMatchObject({ hotkey: '5' })
  expect(await shown(ui, /^│$/)).toBe(true)
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

test('the drawer names the other sessions on an older release with how to update them, and writes this session\'s release for others', async ($, on) => {
  const sessions: Record<string, Presence> = {
    old: { at: Date.now(), folder: 'dhub2', remotes: [], prs: [] },
    oldToo: { at: Date.now(), folder: 'dhub2', remotes: [], prs: [], version: '0.11.0' },
    same: { at: Date.now(), folder: 'web', remotes: [], prs: [], version: '0.12.0' },
  }
  const ui = await opened($, on, [], [], 'mine', { sessions, version: '0.12.0' })
  expect(await shown(ui, /2 sessions on an older version \(dhub2\)/)).toBe(true)
  expect(await shown(ui, /web/)).toBe(false)
  expect(JSON.parse(files.get(SESSIONS)!).self.version).toBe('0.12.0')
  await ui.unmount()
})

test('Reload them all leaves a request from this release for the older sessions, and this session does not reload for it', async ($, on) => {
  const reloads: string[] = []
  on('command.run', { command: 'reload-plugins' }, async ($, e) => {
    reloads.push(e.command)
    return { text: '' }
  })
  const sessions: Record<string, Presence> = { old: { at: Date.now(), folder: 'dhub2', remotes: [], prs: [], version: '0.11.0' } }
  const ui = await opened($, on, [], [], 'mine', { sessions, version: '0.12.0' })
  expect((await ui.find({ key: 'reload-all' }))?.props.label).toBe('Reload them all')
  await ui.press({ key: 'reload-all' })
  expect(JSON.parse(files.get(RELOAD)!)).toMatchObject({ version: '0.12.0' })
  expect((await ui.find({ key: 'reload-all' }))?.props.label).toBe('Asked')
  await clock.advance(30_000)
  expect(reloads).toEqual([])
  await ui.unmount()
})

test('a session on an older release reloads once when a newer one asks after it loaded', async ($, on) => {
  const reloads: string[] = []
  on('command.run', { command: 'reload-plugins' }, async ($, e) => {
    reloads.push(e.command)
    return { text: '' }
  })
  const ui = await opened($, on, [], [], 'mine', { version: '0.11.0' })
  files.set(RELOAD, JSON.stringify({ version: '0.12.0', at: Date.now() + 1_000 }))
  await clock.advance(30_000)
  expect(reloads).toEqual(['reload-plugins'])
  await clock.advance(30_000)
  expect(reloads).toEqual(['reload-plugins'])
  await ui.unmount()
})

test('the drawer never reads the shared file an older release keeps writing, nor shows its error', async ($, on) => {
  const legacy = JSON.stringify({ items: [], mine: [], issues: [], fetchedAt: Date.now(), error: 'old release broke' })
  const ui = await opened($, on, [pr(1, 'waiting')], [], 'mine', { files: { [LEGACY_INBOX]: legacy } })
  expect(await shown(ui, /old release broke/)).toBe(false)
  expect(await shown(ui, /#1/)).toBe(true)
  await ui.unmount()
})

const ACTIONS = '/home/me/.claude/plugins/data/review-inbox/actions.json'

test('More opens a card\'s own buttons, one card at a time, and a press adds the card', async ($, on) => {
  const label = async (key: string) => (await ui.find({ key }))?.props.label
  const own = {
    buttons: [
      { id: 'ship', name: 'Ship it', scope: 'pr', prompt: 'Merge {{.PrUrl}}' },
      { id: 'draft-reply', scope: 'pr', hidden: true },
    ],
  }
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting')], [], 'mine', { files: { [ACTIONS]: JSON.stringify(own) } })

  expect(await ui.find({ key: 'btn-pr:u1-ship' })).toBe(undefined)
  await ui.press({ key: 'more-pr:u1' })
  expect(await label('btn-pr:u1-investigate-ci')).toBe('Investigate CI failure')
  expect(await label('btn-pr:u1-ship')).toBe('Ship it')
  expect(await ui.find({ key: 'btn-pr:u1-draft-reply' })).toBe(undefined)

  await ui.press({ key: 'more-pr:u2' })
  expect(await ui.find({ key: 'btn-pr:u1-ship' })).toBe(undefined)
  await ui.press({ key: 'btn-pr:u2-ship' })
  expect(await label('btn-pr:u2-ship')).toBe('Added')
  await ui.unmount()
})

test('Note and Hide sit in a card\'s More row, not on the card itself', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine')

  expect(await ui.find({ key: 'note-pr:u1' })).toBe(undefined)
  expect(await ui.find({ key: 'hide-u1' })).toBe(undefined)
  await ui.press({ key: 'more-pr:u1' })
  expect(await ui.find({ key: 'note-pr:u1' })).toBeDefined()
  expect(await ui.find({ key: 'hide-u1' })).toBeDefined()
  await ui.unmount()
})

test('/review-inbox buttons names the file and each entry left out with its reason, which the drawer also warns about', async ($, on) => {
  const own = { buttons: [{ id: 'typo', name: 'Typo', scope: 'pr', prompt: 'Look at {{.PrLink}}' }] }
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine', { files: { [ACTIONS]: JSON.stringify(own) } })

  expect(await shown(ui, /typo: unknown variable PrLink/)).toBe(true)
  expect(await shown(ui, /See \/review-inbox buttons/)).toBe(true)
  const { text } = await $.command.run({ command: 'review-inbox', args: 'buttons' })
  expect(text).toContain('My buttons: ~/.claude/plugins/data/review-inbox/actions.json')
  expect(text).toContain('Of my own: 0 buttons, 0 saved searches')
  expect(text).toContain('typo: unknown variable PrLink')
  await ui.unmount()
})

test('a clean actions.json leaves the drawer quiet, and add-button and add-search put their requests into the prompt', async ($, on) => {
  const fills: string[] = []
  on('prompt.fill', async ($, e) => {
    fills.push(e.text)
    return { isFilled: true }
  })
  const ui = await opened($, on, [pr(1, 'changes')], [], 'mine')

  expect(await shown(ui, /review-inbox buttons/)).toBe(false)
  expect((await $.command.run({ command: 'review-inbox', args: 'add-button' })).text).toBe('Added to your prompt; press Enter to send it.')
  await $.command.run({ command: 'review-inbox', args: ' add-search ' })
  expect(fills[0]).toStartWith('Add a button to my review inbox by editing /home/me/.claude/plugins/data/review-inbox/actions.json')
  expect(fills[1]).toStartWith('Add a saved search to my review inbox')
  await ui.unmount()
})

test('the Saved searches tab shows each search with its newest results, a failed one with its error, and a new one as loading', async ($, on) => {
  const label = async (key: string) => (await ui.find({ key }))?.props.label
  const own = {
    groups: [
      { id: 'team', name: 'Team PRs', query: 'org:acme', scope: 'prs', countInBand: true },
      { id: 'bugs', name: 'Bugs', query: 'label:bug', scope: 'issues' },
    ],
  }
  const hit = { repo: 'acme/app', number: 7, title: 'Fix login', url: 'h7', author: 'kim', updatedAt: new Date().toISOString() }
  const groups = {
    team: { query: 'org:acme is:pr sort:updated-desc', count: 25, hits: [hit] },
    'involves-me': { query: 'is:open involves:@me -author:@me is:pr sort:updated-desc', count: 0, hits: [], error: 'HTTP 403: no' },
  }
  const ui = await opened($, on, [], [], 'searches', { files: { [ACTIONS]: JSON.stringify(own) }, groups })

  expect(await label('tab-searches')).toBe('Saved searches')
  expect(await shown(ui, /acme\/app #7/)).toBe(true)
  expect(await shown(ui, /kim · today/)).toBe(true)
  expect(await shown(ui, /24 more on GitHub/)).toBe(true)
  expect(await shown(ui, /Search failed: HTTP 403: no/)).toBe(true)
  expect(await label('fold-searches:bugs')).toBe('▾ Bugs …')
  await ui.press({ key: 'fold-searches:team' })
  expect(await shown(ui, /acme\/app #7/)).toBe(false)
  await ui.unmount()
})

test('a saved search counted in the band adds Saved searches N to it; the others do not', async ($, on) => {
  const own = { groups: [{ id: 'team', name: 'Team PRs', query: 'org:acme', scope: 'prs', countInBand: true }] }
  const groups = {
    team: { query: 'org:acme is:pr sort:updated-desc', count: 3, hits: [] },
    'involves-me': { query: 'is:open involves:@me -author:@me is:pr sort:updated-desc', count: 40, hits: [] },
  }
  const pane = await opened($, on, [pr(1, 'changes')], [], 'mine', { files: { [ACTIONS]: JSON.stringify(own) }, groups })
  await pane.unmount()
  const band = await $.ui.mount({ plugin: 'review-inbox', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false, isWorking: false, maxRows: 10 } })

  expect(await shown(band, /My PRs to act on 1/)).toBe(true)
  expect(await shown(band, /Saved searches 3/)).toBe(true)
  await band.unmount()
})

test('the band keeps what a plugin beneath it draws above the prompt', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, null, 'next: run the tests')
  })
  const pane = await opened($, on, [pr(1, 'changes')], [], 'mine')
  await pane.unmount()

  const band = await $.ui.mount({ plugin: 'review-inbox', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false, isWorking: false, maxRows: 10 } })

  expect(await shown(band, /My PRs to act on 1/)).toBe(true)
  expect(await shown(band, /next: run the tests/)).toBe(true)
  await band.unmount()
})

const thread = (id: string, over: Partial<Thread> = {}): Thread =>
  ({ id, repo: 'o/n', title: `n${id}`, url: `https://github.com/o/n/issues/${id}`, reason: 'comment', updatedAt: '2026-10-22T00:00:00Z', unread: false, ...over })

test('the Notifications tab lists the notifications no other tab covers by reason, counts the unread, and Done waits out its Undo before it is sent', async ($, on) => {
  const sent: string[] = []
  const label = async (key: string) => (await ui.find({ key }))?.props.label
  const activity = { threads: [thread('1', { unread: true }), thread('2', { reason: 'state_change' }), thread('3', { url: 'u1' }), thread('4', { reason: 'mention' })] }
  const ui = await opened($, on, [pr(1, 'changes')], [], 'activity', {
    activity,
    run: args => {
      if (!args.startsWith('gh api -X DELETE ')) return undefined
      sent.push(args.slice('gh api -X DELETE '.length))
      return args.endsWith('threads/2/subscription') ? { exitCode: 1, stderr: 'gh: Not Found (HTTP 404)' } : { exitCode: 0 }
    },
  })

  expect(await label('tab-activity')).toBe('Notifications 1')
  expect(await shown(ui, /● o\/n/)).toBe(true)
  expect(await label('fold-activity:comment')).toBe('▾ Comment 1')
  expect(await label('fold-activity:state_change')).toBe('▾ State changed 1')
  // #3 is a card on My PRs, and a mention is on My issues.
  expect(await ui.find({ key: 'done-3' })).toBeUndefined()
  expect(await ui.find({ key: 'done-4' })).toBeUndefined()

  await ui.press({ key: 'done-1' })
  expect(await shown(ui, /Done · o\/n/)).toBe(true)
  await ui.press({ key: 'undo-1' })
  expect(await ui.find({ key: 'done-1' })).toBeDefined()
  await clock.advance(10_000)
  expect(sent).toEqual([])

  await ui.press({ key: 'done-1' })
  await clock.advance(10_000)
  expect(sent).toEqual(['notifications/threads/1'])
  expect(await ui.find({ key: 'done-1' })).toBeUndefined()
  expect(await label('tab-activity')).toBe('Notifications 0')

  await ui.press({ key: 'unsubscribe-2' })
  await clock.advance(10_000)
  expect(sent).toEqual(['notifications/threads/1', 'notifications/threads/2/subscription'])
  expect(await shown(ui, /Could not update the notification: gh: Not Found \(HTTP 404\)/)).toBe(true)
  expect(await ui.find({ key: 'done-2' })).toBeDefined()
  await ui.unmount()
})

test('without access to notifications the Notifications tab says how to get it', async ($, on) => {
  const ui = await opened($, on, [], [], 'activity', { activity: { threads: [], noAccess: true } })

  expect(await shown(ui, /No access to notifications/)).toBe(true)
  expect(await shown(ui, /No other notifications/)).toBe(false)
  await ui.unmount()
})

const touchedPrs = [
  { ...pr(1, 'changes'), updatedAt: '2026-10-20T00:00:00Z' },
  { ...pr(2, 'waiting'), updatedAt: '2026-10-10T00:00:00Z' },
]

test('a card updated since the drawer was last closed is marked', async ($, on) => {
  const seen = `/home/me/.claude/plugins/data/review-inbox/seen-${cacheKey('', '')}.json`
  const ui = await opened($, on, touchedPrs, [], 'mine', { files: { [seen]: JSON.stringify({ at: Date.parse('2026-10-15T00:00:00Z') }) } })

  expect(await shown(ui, /● o\/r #1/)).toBe(true)
  expect(await shown(ui, /● o\/r #2/)).toBe(false)
  await ui.unmount()
})

test('nothing is marked before the drawer has been closed once', async ($, on) => {
  const ui = await opened($, on, touchedPrs, [], 'mine')

  expect(await shown(ui, /●/)).toBe(false)
  await ui.unmount()
})

// GitHub as the direct actions see it: I am `me`, the PR's head is `head`, and every write is recorded and taken.
const github = (sent: string[], head = 'a') => (args: string) => {
  if (args === 'gh api user --jq .login') return { exitCode: 0, stdout: 'me\n' }
  if (/^gh api repos\/o\/r\/pulls\/\d+ --jq \.head\.sha$/.test(args)) return { exitCode: 0, stdout: `${head}\n` }
  if (!args.startsWith('gh api -X ')) return undefined
  sent.push(args.slice('gh api '.length))
  return { exitCode: 0 }
}
const DIRECT = { options: { directActions: 'on' } }

test('with Direct GitHub actions off no card writes to GitHub, and an approved PR still offers Merge to fill in', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'approved'), pr(2, 'draft')], [], 'mine', { items: [item(5)] })

  expect(await ui.find({ key: 'direct-ready-pr:u2' })).toBeUndefined()
  await ui.press({ key: 'merge-pr:u1' })
  expect((await ui.find({ key: 'merge-pr:u1' }))?.props.label).toBe('Added')
  await ui.press({ key: 'tab-review' })
  expect(await ui.find({ key: 'direct-approve-o/r#5' })).toBeUndefined()
  await ui.unmount()
})

test('Approve asks on the card, ignores a confirm in its first 300 ms, and sends an approval of the commit I looked at', DIRECT, async ($, on) => {
  const sent: string[] = []
  const ui = await opened($, on, [], [], 'review', { items: [item(5)], run: github(sent) })

  await ui.press({ key: 'direct-approve-o/r#5' })
  expect(await shown(ui, /Approve o\/r#5 "r5" as me — \(no comment\)/)).toBe(true)
  await ui.press({ key: 'direct-cancel-o/r#5' })
  expect(await ui.find({ key: 'direct-confirm-o/r#5' })).toBeUndefined()

  await ui.press({ key: 'direct-approve-o/r#5' })
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual([])
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual(['-X POST repos/o/r/pulls/5/reviews -f event=APPROVE -f commit_id=a'])
  expect(await shown(ui, /✓ Approved/)).toBe(true)
  expect(await ui.find({ key: 'direct-approve-o/r#5' })).toBeUndefined()
  await ui.unmount()
})

test('a confirm row left alone for ten seconds goes back to the buttons', DIRECT, async ($, on) => {
  const ui = await opened($, on, [pr(1, 'draft')], [], 'mine', { run: github([]) })

  await ui.press({ key: 'direct-ready-pr:u1' })
  expect(await shown(ui, /code owners are asked to review/)).toBe(true)
  await clock.advance(10_000)
  expect(await ui.find({ key: 'direct-confirm-pr:u1' })).toBeUndefined()
  expect(await ui.find({ key: 'direct-ready-pr:u1' })).toBeDefined()
  await ui.unmount()
})

test('a head that moved since I looked stops the approval, and the card says so', DIRECT, async ($, on) => {
  const sent: string[] = []
  const ui = await opened($, on, [], [], 'review', { items: [item(5)], run: github(sent, 'b') })

  await ui.press({ key: 'direct-approve-o/r#5' })
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual([])
  expect(await shown(ui, /New commits since you looked/)).toBe(true)
  expect(await ui.find({ key: 'direct-approve-o/r#5' })).toBeDefined()
  await ui.unmount()
})

test('Assign me is sent at once and its Undo takes it back', DIRECT, async ($, on) => {
  const sent: string[] = []
  const ui = await opened($, on, [], [issue(1, 'mention')], 'issues', { run: github(sent) })

  await ui.press({ key: 'direct-assign-issue:mention:i1:' })
  expect(sent).toEqual(['-X POST repos/o/i/issues/1/assignees -f assignees[]=me'])
  expect(await shown(ui, /✓ Assigned to you/)).toBe(true)
  await ui.press({ key: 'direct-undo-issue:mention:i1:' })
  expect(sent.at(-1)).toBe('-X DELETE repos/o/i/issues/1/assignees -f assignees[]=me')
  expect(await ui.find({ key: 'direct-assign-issue:mention:i1:' })).toBeDefined()
  await ui.unmount()
})

const AUTO = `/home/me/.claude/plugins/data/review-inbox/autoreview-${cacheKey('', '')}.json`
const AUTO_ON = { options: { autoReview: 'on' } }
const recent = (number: number): InboxItem => ({ ...item(number), headSha: `h${number}`, requestedAt: new Date(Date.now() - 60_000).toISOString() })

test('turning auto review on records when, says only that it is on, and an older request is reviewed too', AUTO_ON, async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const ui = await opened($, on, [], [], 'review', {
    items: [item(5)],
    files: { [AUTO]: JSON.stringify({ jobs: { 'o/r#5': { headSha: 'a', firstSeenAt: Date.now() - 3_600_000 } } }) },
  })

  expect(JSON.parse(files.get(AUTO)!).enabledAt).toBeGreaterThan(Date.now() - 60_000)
  expect(toasts.filter(t => t.startsWith('Auto review is'))).toEqual(['Auto review is on'])
  expect(await shown(ui, /Auto review: next in line/)).toBe(true)
  await ui.unmount()
})

test('with autoReviewBacklog off an older request says why on its card and has no button to start it', { options: { autoReview: 'on', autoReviewBacklog: 'off' } }, async ($, on) => {
  const ui = await opened($, on, [], [], 'review', {
    items: [item(5)],
    files: { [AUTO]: JSON.stringify({ jobs: { 'o/r#5': { headSha: 'a', firstSeenAt: Date.now() - 3_600_000 } } }) },
  })
  expect(await shown(ui, /Requested before auto review was turned on/)).toBe(true)
  expect(await ui.find({ key: 'auto-run-o/r#5' })).toBeUndefined()
  await ui.unmount()
})

test('the switch atop the Review tab warns before turning auto review on for every session, turns it off at once, and once pressed decides whatever the setting says', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const got = agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub({ created: [] }) })
  await tick()
  expect(got.spawns).toHaveLength(0)

  // The warning says what it costs and where the details are set; Cancel, or ten seconds, leaves it off.
  await ui.press({ key: 'auto-switch' })
  expect(await shown(ui, /^Turn on auto review\? .* uses more tokens\.$/)).toBe(true)
  expect(await shown(ui, /^Change the details in \/config\.$/)).toBe(true)
  expect(await shown(ui, /^Reviews run in this session\. .*auto-review-here/)).toBe(true)
  await ui.press({ key: 'auto-cancel' })
  expect(await ui.find({ key: 'auto-confirm' })).toBeUndefined()
  await ui.press({ key: 'auto-switch' })
  await clock.advance(10_000)
  expect(await ui.find({ key: 'auto-confirm' })).toBeUndefined()
  expect(JSON.parse(files.get(AUTO)!).switch).toBeUndefined()

  // A confirm in the first 300 ms is a stray key.
  await ui.press({ key: 'auto-switch' })
  await ui.press({ key: 'auto-confirm' })
  expect(JSON.parse(files.get(AUTO)!).switch).toBeUndefined()
  await clock.advance(300)
  await ui.press({ key: 'auto-confirm' })
  const file = JSON.parse(files.get(AUTO)!)
  expect([file.switch, file.reviewer, file.enabledAt > 0]).toEqual([{ isOn: true }, 'self', true])
  expect(await shown(ui, /Auto review: next in line/)).toBe(true)
  await tick()
  expect(got.spawns).toHaveLength(1)

  await ui.press({ key: 'auto-switch' })
  expect(JSON.parse(files.get(AUTO)!).switch).toEqual({ isOn: false })
  expect(JSON.parse(files.get(AUTO)!).reviewer).toBeUndefined()
  // Toasts keep their gap; the first is this session forgetting when the file says auto review was last on.
  await clock.advance(10_000)
  expect(toasts.filter(t => t.startsWith('Auto review is'))).toEqual(['Auto review is off', 'Auto review is on', 'Auto review is off'])

  // The setting is only where it starts: a pressed switch holds whichever way the setting turns later.
  expect(switchedOn({ ...file, switch: { isOn: false } }, true)).toBe(false)
  expect(switchedOn({ ...file, switch: { isOn: true } }, false)).toBe(true)
  expect(switchedOn({ jobs: {} }, true)).toBe(true)
  await ui.unmount()
})

test('the first time the switch turns auto review on, a request to set it up with Claude goes into the prompt, and later times it does not', async ($, on) => {
  const fills: string[] = []
  on('prompt.fill', async ($, e) => {
    fills.push(e.text)
    return { isFilled: true }
  })
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub({ created: [] }) })
  const turnOn = async () => {
    await ui.press({ key: 'auto-switch' })
    await clock.advance(300)
    await ui.press({ key: 'auto-confirm' })
  }

  await turnOn()
  expect(fills).toHaveLength(1)
  expect(fills[0]).toStartWith('Set up auto review in my review inbox with me.')
  expect(fills[0]!.includes('/home/me/.claude/settings.json')).toBe(true)
  // On and off is the switch's alone, so the setup neither asks about it nor writes it.
  expect(fills[0]!.includes('- autoReview:')).toBe(false)
  expect(fills[0]!.includes('Leave autoReview out')).toBe(true)
  expect(fills[0]!.includes('- autoReviewInstructions:')).toBe(true)
  expect(JSON.parse(files.get(AUTO)!).setupAt > 0).toBe(true)
  await clock.advance(10_000)
  expect(toasts).toContain('Added a setup request to your prompt; press Enter to go through the settings with Claude.')

  await ui.press({ key: 'auto-switch' })
  await turnOn()
  expect(fills).toHaveLength(1)
  await ui.unmount()
})

test('/review-inbox auto-review-config puts the setup request into the prompt with the values set now', { options: { autoReviewModel: 'opus', autoReviewInstructions: 'Check the SQL first.' } }, async ($, on) => {
  const fills: string[] = []
  on('prompt.fill', async ($, e) => {
    fills.push(e.text)
    return { isFilled: true }
  })
  const ui = await opened($, on, [], [], 'review')

  expect((await $.command.run({ command: 'review-inbox', args: 'auto-review-config' })).text).toBe('Added to your prompt; press Enter to send it.')
  expect(fills[0]).toStartWith('Set up auto review in my review inbox with me.')
  expect(fills[0]!.includes('- autoReview:')).toBe(false)
  expect(fills[0]!.includes('default sonnet; now opus')).toBe(true)
  expect(fills[0]!.includes('now Check the SQL first.')).toBe(true)
  await ui.unmount()
})

test('with autoReviewPost on verdict a finished review is posted with the verdict it suggests and leaves auto review', { options: { autoReview: 'on', autoReviewPost: 'verdict' } }, async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const g: Github = { created: [], posted: [], locks: [{ status: 201, at: Date.now() }], unlocked: [] }
  agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()
  await finish($, 'a1', ANSWER)

  expect(g.created).toHaveLength(1)
  expect(g.posted).toEqual(['gh api -X POST repos/o/r/pulls/5/reviews/77/events -f event=REQUEST_CHANGES'])
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].status).toBe('closed')
  expect(toasts).toContain('Auto review posted as Request changes · o/r #5')
  await ui.unmount()
})

test('a post GitHub refuses keeps the auto review as my pending review, to post from the card', { options: { autoReview: 'on', autoReviewPost: 'comment' } }, async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const g: Github = { created: [], posted: [], postFails: true, locks: [{ status: 201, at: Date.now() }], unlocked: [] }
  agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()
  await finish($, 'a1', ANSWER)

  expect(g.posted).toEqual(['gh api -X POST repos/o/r/pulls/5/reviews/77/events -f event=COMMENT'])
  const job = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([job.status, job.reviewId]).toEqual(['done', 77])
  expect(toasts.some(t => t.startsWith('Auto review kept as your pending review; posting it failed'))).toBe(true)
  await ui.unmount()
})

test('with autoReviewVerify on a draft with findings goes to a second reviewer that checks each one, and its answer is what is stored', { options: { autoReview: 'on', autoReviewVerify: 'on' } }, async ($, on) => {
  const g: Github = { created: [], locks: [{ status: 201, at: Date.now() }], unlocked: [] }
  const got = agents(on, () => ['a1', 'a2'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()
  await finish($, 'a1', ANSWER)

  expect(g.created).toHaveLength(0)
  expect(got.spawns).toHaveLength(2)
  expect(got.spawns[1]!.prompt?.includes('two is off by one')).toBe(true)
  expect(got.spawns[1]!.prompt?.includes(`${RUNS}/o-r-5-h5/pr.diff`)).toBe(true)
  const checking = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([checking.status, checking.agentId]).toEqual(['running', 'a2'])

  const checked = { verdict: 'comment', summary: 'A small thing.', findings: [{ severity: 'minor', path: 'a.ts', line: 2, body: 'two reads oddly' }] }
  await finish($, 'a2', JSON.stringify(checked))
  expect(g.created).toHaveLength(1)
  expect(g.created[0]!.includes('**minor** two reads oddly')).toBe(true)
  expect(g.created[0]!.includes('off by one')).toBe(false)
  const job = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([job.status, job.result.verdict, job.tokens, job.draft]).toEqual(['done', 'comment', 84_000, undefined])
  await ui.unmount()
})

test('with autoReviewVerify on a draft with no findings is stored as it is, with no second reviewer', { options: { autoReview: 'on', autoReviewVerify: 'on' } }, async ($, on) => {
  const g: Github = { created: [], locks: [{ status: 201, at: Date.now() }], unlocked: [] }
  const got = agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()
  await finish($, 'a1', JSON.stringify({ verdict: 'approve', summary: 'LGTM', findings: [] }))

  expect(got.spawns).toHaveLength(1)
  expect(g.created).toHaveLength(1)
  await ui.unmount()
})

test('a new request waits for its commits to settle, and a team request shows no auto-review line', AUTO_ON, async ($, on) => {
  const now = Date.now()
  const auto = { enabledAt: now - 3_600_000, jobs: { 'o/r#5': { headSha: 'h5', firstSeenAt: now }, 'o/r#6': { headSha: 'h6', firstSeenAt: now } } }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5), { ...recent(6), team: 'core' }], files: { [AUTO]: JSON.stringify(auto) } })

  expect(await shown(ui, /Auto review starts in about 30 min/)).toBe(true)
  expect(await ui.findAll({ type: 'Text', text: /Auto review/ })).toHaveLength(1)
  await ui.unmount()
})

test('with autoReviewSettleMinutes set, a new request waits that long instead of 30 minutes', { options: { autoReview: 'on', autoReviewSettleMinutes: '10' } }, async ($, on) => {
  const now = Date.now()
  const auto = { enabledAt: now - 3_600_000, jobs: { 'o/r#5': { headSha: 'h5', firstSeenAt: now } } }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: JSON.stringify(auto) } })

  expect(await shown(ui, /Auto review starts in about 10 min/)).toBe(true)
  await ui.unmount()
})

test('with auto review off no card shows an auto-review line, nothing is recorded and no agent type is registered', async ($, on) => {
  const got = agents(on)
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)] })
  await tick()
  expect(got.specs).toHaveLength(0)

  expect(await shown(ui, /Auto review|auto review/)).toBe(false)
  expect(files.has(AUTO)).toBe(false)
  await ui.unmount()
})

test('with auto review on and nothing to review, no model is asked and no agent is started', AUTO_ON, async ($, on) => {
  let calls = 0
  on('model.complete', async () => {
    calls++
    throw new Error('no model call expected')
  })
  on('agent.spawn', async () => {
    calls++
    throw new Error('no agent expected')
  })
  const ui = await opened($, on, [], [], 'review')
  await clock.advance(2 * 3_600_000)

  expect(calls).toBe(0)
  await ui.unmount()
})

// A queued, settled job on #5, and GitHub answering as it would for a PR with one hunk and none of my reviews.
const RUNS = '/home/me/.claude/plugins/data/review-inbox/runs'
const queued = (more: Record<string, unknown> = {}) =>
  JSON.stringify({ enabledAt: Date.now() - 3_600_000, jobs: { 'o/r#5': { headSha: 'h5', firstSeenAt: Date.now() - 3_600_000, ...more } } })
// `locks`: GitHub's answer to each 👀 added, in turn; none fails the add, as on a repository that takes no reactions.
type Github = { reviews?: string; created?: string[]; createFails?: boolean; posted?: string[]; postFails?: boolean; calls?: string[]; deleted?: string[]; locks?: { status: number; at: number }[]; unlocked?: string[] }
const PATCH = '@@ -1,2 +1,3 @@\n one\n+two\n three'
const autoGithub = (g: Github) => (args: string, stdin?: string) => {
  g.calls?.push(args)
  if (args === 'gh api user --jq .login') return { exitCode: 0, stdout: 'me\n' }
  // My pending review 9 on h4, as I left it on GitHub.
  if (args === 'gh api repos/o/r/pulls/5/reviews/9 --jq .body') return { exitCode: 0, stdout: 'Edited on GitHub.\n\n<!-- review-inbox auto-review sha=h4 key=k -->\n' }
  if (args.startsWith('gh api --paginate repos/o/r/pulls/5/reviews/9/comments'))
    return { exitCode: 0, stdout: `${JSON.stringify({ path: 'a.ts', position: 2, body: '**major** mine' })}\n${JSON.stringify({ path: 'b.ts', position: null, body: 'whole file' })}\n` }
  if (args.startsWith('gh api -X DELETE repos/o/r/pulls/5/reviews/')) {
    g.deleted?.push(args)
    return { exitCode: 0 }
  }
  if (args.startsWith('gh api --paginate repos/o/r/pulls/5/reviews')) return { exitCode: 0, stdout: g.reviews ?? '' }
  if (args.startsWith('gh api --paginate repos/o/r/pulls/5/files'))
    return { exitCode: 0, stdout: `${JSON.stringify({ filename: 'a.ts', patch: PATCH })}\n` }
  if (args === 'gh pr diff 5 --repo o/r') return { exitCode: 0, stdout: 'diff --git a/a.ts b/a.ts' }
  if (args.startsWith('gh api -X POST repos/o/r/pulls/5/reviews/77/events')) {
    g.posted?.push(args)
    return g.postFails ? { exitCode: 1, stderr: 'gh: Unprocessable Entity (HTTP 422)' } : { exitCode: 0 }
  }
  if (args.startsWith('gh api -X POST repos/o/r/pulls/5/reviews')) {
    g.created?.push(stdin ?? '')
    return g.createFails ? { exitCode: 1, stderr: 'gh: Unprocessable Entity (HTTP 422)' } : { exitCode: 0, stdout: '77\n' }
  }
  if (args.startsWith('gh api -i -X POST repos/o/r/issues/5/reactions')) {
    const lock = g.locks?.shift()
    return lock && { exitCode: 0, stdout: `HTTP/2.0 ${lock.status} OK\nEtag: "e"\n\n${JSON.stringify({ created_at: new Date(lock.at).toISOString(), id: 3 })}\n` }
  }
  if (args.startsWith('gh api -X DELETE repos/o/r/issues/5/reactions/')) {
    g.unlocked?.push(args)
    return { exitCode: 0 }
  }
  if (args.startsWith('rm -rf')) return { exitCode: 0 }
  return undefined
}
// The spawn as the Agent tool's call spells it.
type Spawned = { subagent_type?: string; cwd?: string; model?: string; name?: string; run_in_background?: boolean; prompt?: string }
function agents(on: On, live: () => string[] = () => []) {
  const got = { specs: [] as { tools?: readonly string[]; name: string }[], spawns: [] as Spawned[] }
  on('agent.register', async ($, e) => {
    got.specs.push(e)
    return { value: { agent: `review-inbox:${e.name}` } }
  })
  on('agent.spawn', async ($, e) => {
    got.spawns.push(e as unknown as Spawned)
    return { model: 'sonnet' }
  })
  // Stands for the engine beneath, which ends the turn.
  on('turn.complete', async ($, e) => ({ text: e.answer, reason: 'answer' as const }))
  // The nth spawn is agent a<n>, listed by its name while `live` says it runs.
  on('agent.list', async () => ({
    value: got.spawns.flatMap((s, i) => (live().includes(`a${i + 1}`) ? [{ id: `a${i + 1}`, name: s.name, description: 'd', type: 'review-inbox:auto-reviewer', status: 'running' as const }] : [])),
  }))
  return got
}
const ANSWER = JSON.stringify({
  verdict: 'request-changes',
  summary: 'One bug.',
  findings: [
    { severity: 'major', path: 'a.ts', line: 2, body: 'two is off by one' },
    { severity: 'nit', path: 'a.ts', line: 40, body: 'outside the diff' },
  ],
})
const finish = ($: Parameters<TestBody>[0], agentId: string, answer: string, isAborted = false) =>
  $.turn.complete({
    answer,
    agentId,
    isAborted,
    reason: isAborted ? 'aborted' : 'answer',
    turnId: 't',
    durationMs: 1,
    usage: { model: 'sonnet', input_tokens: 40_000, output_tokens: 2_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  } as Parameters<typeof $.turn.complete>[0])
const tick = async () => {
  for (let i = 0; i < 4; i++) await clock.advance(30_000)
}

test('with the review session elsewhere and closed, a queued PR waits and says so, until auto-review-here or auto-review-anywhere hands it over', AUTO_ON, async ($, on) => {
  const got = agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: JSON.stringify({ ...JSON.parse(queued()), reviewer: 'gone' }) }, run: autoGithub({ created: [], locks: [{ status: 201, at: Date.now() }] }) })
  await tick()
  expect(got.spawns).toHaveLength(0)
  expect(await shown(ui, /Auto review: waiting for its session/)).toBe(true)

  expect((await $.command.run({ command: 'review-inbox', args: 'auto-review-anywhere' })).text).toBe('Auto reviews now run in any session.')
  expect(JSON.parse(files.get(AUTO)!).reviewer).toBeUndefined()
  expect((await $.command.run({ command: 'review-inbox', args: 'auto-review-here' })).text).toBe('Auto reviews now run in this session.')
  expect(JSON.parse(files.get(AUTO)!).reviewer).toBe('self')
  await tick()
  expect(got.spawns).toHaveLength(1)
  await ui.unmount()
})

test('a session that is not the review session leaves queued PRs to it while it is open', AUTO_ON, async ($, on) => {
  const got = agents(on)
  const ui = await opened($, on, [], [], 'review', {
    items: [recent(5)],
    files: { [AUTO]: JSON.stringify({ ...JSON.parse(queued()), reviewer: 'other' }), [SESSIONS]: JSON.stringify({ other: { at: Date.now(), folder: 'r', remotes: [], prs: [] } }) },
    run: autoGithub({ created: [] }),
  })
  await tick()
  expect(got.spawns).toHaveLength(0)
  expect(await shown(ui, /Auto review: next in line/)).toBe(true)
  await ui.unmount()
})

test('the next queued PR is reviewed by a read-only subagent and stored as my pending review, comments only on lines the diff has', AUTO_ON, async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const g: Github = { created: [], locks: [{ status: 201, at: Date.now() }], unlocked: [] }
  const got = agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()

  expect(got.spawns).toHaveLength(1)
  const spawn = got.spawns[0]!
  expect([spawn.subagent_type, spawn.cwd, spawn.model, spawn.run_in_background]).toEqual(['review-inbox:auto-reviewer', `${RUNS}/o-r-5-h5`, 'sonnet', true])
  expect(spawn.prompt?.includes(`${RUNS}/o-r-5-h5/pr.diff`)).toBe(true)
  expect(got.specs[0]!.tools).toEqual(['Read', 'Grep', 'Glob'])
  expect(files.get(`${RUNS}/o-r-5-h5/pr.diff`)).toBe('diff --git a/a.ts b/a.ts')
  expect(await shown(ui, /Auto review running/)).toBe(true)
  const running = JSON.parse(files.get(AUTO)!)
  expect([running.jobs['o/r#5'].status, running.jobs['o/r#5'].agentId, running.started, running.jobs['o/r#5'].lock]).toEqual(['running', 'a1', 1, 'repos/o/r/issues/5/reactions/3'])
  expect(g.unlocked).toEqual([])

  await finish($, 'a1', ANSWER)
  const sent = JSON.parse(g.created![0]!)
  expect(sent.commit_id).toBe('h5')
  expect(sent.event).toBeUndefined()
  expect(sent.comments).toEqual([{ path: 'a.ts', line: 2, side: 'RIGHT', body: '**major** two is off by one' }])
  expect(sent.body.includes('**nit**\n- outside the diff (`a.ts:40`)')).toBe(true)
  expect(sent.body.includes('<!-- review-inbox auto-review sha=h5 key=')).toBe(true)
  const done = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([done.status, done.reviewId, done.tokens, done.lock]).toEqual(['done', 77, 42_000, undefined])
  expect(g.unlocked).toEqual(['gh api -X DELETE repos/o/r/issues/5/reactions/3'])
  expect(toasts).toContain('Auto review done, suggests Request changes · o/r #5')
  expect(await shown(ui, /Auto review suggests Request changes · 1 major, 1 nit · about 42k tokens/)).toBe(true)
  expect(await shown(ui, /major · a.ts:2 · two is off by one/)).toBe(true)
  await ui.unmount()

  const band = await $.ui.mount({ plugin: 'review-inbox', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false, isWorking: false, maxRows: 10 } })
  expect(await shown(band, /auto-reviewed 1/)).toBe(true)
  await band.unmount()
})

test('my 👀 on the PR, added by another machine of mine within the hour, starts no subagent here and the card shows the review running', AUTO_ON, async ($, on) => {
  const got = agents(on)
  const g: Github = { locks: [{ status: 200, at: Date.now() - 10 * 60_000 }], unlocked: [] }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()

  expect(got.spawns).toHaveLength(0)
  expect(g.unlocked).toEqual([])
  const job = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([job.status, job.lock, job.elsewhere.until > Date.now()]).toEqual([undefined, undefined, true])
  expect(await shown(ui, /Auto review running · 10 min so far/)).toBe(true)
  await ui.unmount()
})

test('a 👀 older than the hour, left by a machine that stopped mid-review, is taken over and the review runs here', AUTO_ON, async ($, on) => {
  const got = agents(on, () => ['a1'])
  const g: Github = { locks: [{ status: 200, at: Date.now() - 2 * 60 * 60_000 }, { status: 201, at: Date.now() }], unlocked: [] }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()

  expect(g.unlocked).toEqual(['gh api -X DELETE repos/o/r/issues/5/reactions/3'])
  expect(got.spawns).toHaveLength(1)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].lock).toBe('repos/o/r/issues/5/reactions/3')
  await ui.unmount()
})

test('my pending review on this head starts no subagent', AUTO_ON, async ($, on) => {
  const got = agents(on)
  const reviews = `${JSON.stringify({ id: 9, state: 'PENDING', commit_id: 'h5', login: 'me' })}\n`
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub({ reviews }) })
  await tick()

  expect(got.spawns).toHaveLength(0)
  const job = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([job.status, job.reviewId]).toEqual(['done', 9])
  expect(await shown(ui, /your pending review is on GitHub/)).toBe(true)
  await ui.unmount()
})

const PENDING_ON_H4 = `${JSON.stringify({ id: 9, state: 'PENDING', commit_id: 'h4', login: 'me' })}\n`
const RESULT = { verdict: 'comment', summary: 'Fine.', findings: [{ severity: 'major', path: 'a.ts', line: 2, body: 'mine' }] }

test('a rebase with the same content carries my pending review to the new head, edits kept, with no model call', AUTO_ON, async ($, on) => {
  const got = agents(on)
  const g: Github = { reviews: PENDING_ON_H4, created: [], deleted: [] }
  const prev = { headSha: 'h4', reviewId: 9, contentKey: contentKey([{ filename: 'a.ts', patch: PATCH }]), result: RESULT }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued({ prev }) }, run: autoGithub(g) })
  await tick()

  expect(got.spawns).toHaveLength(0)
  expect(g.deleted).toEqual(['gh api -X DELETE repos/o/r/pulls/5/reviews/9'])
  const sent = JSON.parse(g.created![0]!)
  expect(sent.commit_id).toBe('h5')
  expect(sent.comments).toEqual([{ path: 'a.ts', position: 2, body: '**major** mine' }])
  expect(sent.body).toBe('Edited on GitHub.\n\n<!-- review-inbox auto-review sha=h5 key=k -->\n\n- `b.ts` whole file')
  const job = JSON.parse(files.get(AUTO)!)
  expect([job.jobs['o/r#5'].status, job.jobs['o/r#5'].reviewId, job.jobs['o/r#5'].carriedFrom, job.started]).toEqual(['done', 77, 'h4', undefined])
  expect(await shown(ui, /Carried from h4, same content/)).toBe(true)
  expect(await shown(ui, /Auto review suggests Comment/)).toBe(true)
  await ui.unmount()
})

test('new content since my pending review leaves it alone and offers Review again, which deletes it and runs on the new head', AUTO_ON, async ($, on) => {
  const got = agents(on, () => ['a1'])
  const g: Github = { reviews: PENDING_ON_H4, created: [], deleted: [] }
  const prev = { headSha: 'h4', reviewId: 9, contentKey: 'other', result: RESULT }
  const run = (args: string, stdin?: string) =>
    /^gh api repos\/o\/r\/pulls\/5 --jq \.head\.sha$/.test(args) ? { exitCode: 0, stdout: 'h5\n' } : autoGithub(g)(args, stdin)
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued({ prev }) }, run })
  await tick()

  expect(got.spawns).toHaveLength(0)
  expect([g.deleted, g.created]).toEqual([[], []])
  expect(await shown(ui, /New commits since your pending review on h4/)).toBe(true)
  expect(await ui.find({ key: 'direct-post-comment-o/r#5' })).toBeUndefined()
  expect(await ui.find({ key: 'direct-discard-o/r#5' })).toBeDefined()

  await ui.press({ key: 'direct-review-again-o/r#5' })
  expect(await shown(ui, /Delete me's pending review on o\/r#5 "r5", made for an older commit/)).toBe(true)
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(g.deleted).toEqual(['gh api -X DELETE repos/o/r/pulls/5/reviews/9'])
  g.reviews = ''
  await tick()
  expect(got.spawns).toHaveLength(1)
  await ui.unmount()
})

test('a run whose PR got a new head is stopped by the session holding it, and its answer is never stored', AUTO_ON, async ($, on) => {
  const stopped: string[] = []
  on('tool.call', { tool: 'TaskStop' }, async ($, e) => {
    stopped.push((e as unknown as { task_id: string }).task_id)
    return { result: { message: 'stopped', task_id: 'a1' } } as never
  })
  // Listed as running until it is stopped.
  const got = agents(on, () => (stopped.length > 0 ? [] : ['a1']))
  const g: Github = { created: [] }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub(g) })
  await tick()
  expect(got.spawns).toHaveLength(1)

  // As the fetching session's trackHeads writes it once the PR has a new head.
  files.set(AUTO, JSON.stringify({ ...JSON.parse(files.get(AUTO)!), jobs: { 'o/r#5': { headSha: 'h6', firstSeenAt: Date.now() } } }))
  await tick()
  expect(stopped).toEqual(['a1'])
  await finish($, 'a1', ANSWER)
  expect(g.created).toEqual([])
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].status).toBeUndefined()
  await ui.unmount()
})

test('a head I already reviewed on GitHub says so instead of starting a run', AUTO_ON, async ($, on) => {
  const got = agents(on)
  const reviews = `${JSON.stringify({ id: 4, state: 'COMMENTED', commit_id: 'h5', login: 'me' })}\n`
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub({ reviews }) })
  await tick()

  expect(got.spawns).toHaveLength(0)
  expect(await shown(ui, /you already reviewed this commit/)).toBe(true)
  await ui.unmount()
})

test("a run another session holds is left alone while it renews it, and once it has gone quiet goes back to the front of the queue without counting as an attempt", AUTO_ON, async ($, on) => {
  const got = agents(on, () => ['a1'])
  const held = queued({ status: 'running', runner: 'other', agentId: 'x', startedAt: Date.now(), heartbeatAt: Date.now() })
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: held }, run: autoGithub({}) })
  await tick()
  expect(got.spawns).toHaveLength(0)

  files.set(AUTO, queued({ status: 'running', runner: 'other', agentId: 'x', attempts: 1, startedAt: Date.now() - 600_000, heartbeatAt: Date.now() - 180_000 }))
  await tick()
  expect(got.spawns).toHaveLength(1)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].attempts).toBe(1)
  await ui.unmount()
})

test('a run that looks quiet once, as every run does after the machine sleeps, is not started again when its session renews it next', AUTO_ON, async ($, on) => {
  const got = agents(on, () => ['a1'])
  const quiet = { status: 'running' as const, runner: 'other', agentId: 'x', startedAt: Date.now() - 600_000 }
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued({ ...quiet, heartbeatAt: Date.now() - 180_000 }) }, run: autoGithub({}) })
  await clock.advance(30_000)
  files.set(AUTO, queued({ ...quiet, heartbeatAt: Date.now() }))
  await tick()
  expect(got.spawns).toHaveLength(0)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].runner).toBe('other')
  await ui.unmount()
})

test('an answer that does not parse is tried once more, then the card says so and offers Try again', AUTO_ON, async ($, on) => {
  const got = agents(on, () => [`a${got.spawns.length}`])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued() }, run: autoGithub({}) })
  await tick()
  await finish($, 'a1', 'I could not finish.')
  await tick()
  expect(got.spawns).toHaveLength(2)
  await finish($, 'a2', 'Still no JSON.')
  await tick()

  expect(got.spawns).toHaveLength(2)
  expect(await shown(ui, /Auto review failed: the reviewer's answer could not be read/)).toBe(true)
  await ui.press({ key: 'auto-run-o/r#5' })
  await tick()
  expect(got.spawns).toHaveLength(3)
  await ui.unmount()
})

test('a create GitHub refuses because my pending review appeared meanwhile adopts that review', AUTO_ON, async ($, on) => {
  const g: Github = { created: [], createFails: true }
  const run = autoGithub(g)
  let pendingNow = false
  const got = agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', {
    items: [recent(5)],
    files: { [AUTO]: queued() },
    run: (args, stdin) => {
      if (args.startsWith('gh api -X POST')) pendingNow = true
      if (pendingNow && args.startsWith('gh api --paginate repos/o/r/pulls/5/reviews')) return { exitCode: 0, stdout: `${JSON.stringify({ id: 31, state: 'PENDING', commit_id: 'h5', login: 'me' })}\n` }
      return run(args, stdin)
    },
  })
  await tick()
  expect(got.spawns).toHaveLength(1)
  await finish($, 'a1', ANSWER)

  const job = JSON.parse(files.get(AUTO)!).jobs['o/r#5']
  expect([job.status, job.reviewId]).toEqual(['done', 31])
  await ui.unmount()
})

test('a stopped run stores nothing and waits for Try again rather than starting over', AUTO_ON, async ($, on) => {
  const g: Github = { created: [] }
  agents(on, () => [])
  const ui = await opened($, on, [], [], 'review', { items: [recent(5)], files: { [AUTO]: queued({ status: 'running', runner: 'self', agentId: 'a9', heartbeatAt: Date.now() }) }, run: autoGithub(g) })
  await finish($, 'a9', ANSWER, true)

  expect(g.created).toHaveLength(0)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].status).toBe('failed')
  expect(await shown(ui, /Auto review failed: the review was stopped/)).toBe(true)
  await ui.unmount()
})

test('with the repository folder known, the run reads a detached worktree at the head, removed when the review is stored', { options: { autoReview: 'on', repoPaths: 'o/r=/src/r' } }, async ($, on) => {
  const g: Github = { created: [], calls: [] }
  const run = autoGithub(g)
  agents(on, () => ['a1'])
  const ui = await opened($, on, [], [], 'review', {
    items: [recent(5)],
    files: { [AUTO]: queued(), '/src/r': '' },
    run: (args, stdin) => (args.startsWith('git -C /src/r ') ? (g.calls!.push(args), { exitCode: 0 }) : run(args, stdin)),
  })
  await tick()
  const folder = `${RUNS}/o-r-5-h5`
  const checkout = () => g.calls!.filter(c => c.startsWith('git -C /src/r') || c.startsWith('rm '))
  expect(checkout()).toEqual(['git -C /src/r fetch --quiet origin pull/5/head', `git -C /src/r worktree add --detach ${folder}/repo h5`])
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].checkout).toBe('/src/r')

  await finish($, 'a1', ANSWER)
  expect(checkout().slice(2)).toEqual([`git -C /src/r worktree remove --force ${folder}/repo`, `rm -rf ${folder}`])
  await ui.unmount()
})

// A stored auto review on #5's head, pending on GitHub as review 77.
const reviewed = queued({ status: 'done', reviewId: 77, result: { verdict: 'request-changes', summary: 'One bug.', findings: [] }, tokens: 42_000 })
const autoItem = { ...recent(5), headSha: 'h5' }

test('a stored auto review offers its post buttons without Direct GitHub actions, the suggested one first in color, and a link to it on GitHub', AUTO_ON, async ($, on) => {
  const ui = await opened($, on, [], [], 'review', { items: [autoItem], files: { [AUTO]: reviewed }, run: github([], 'h5') })

  expect((await ui.find({ key: 'direct-post-changes-o/r#5' }))?.props.variant).toBe('primary')
  expect((await ui.find({ key: 'direct-post-comment-o/r#5' }))?.props.variant).toBeUndefined()
  expect(await ui.find({ key: 'direct-discard-o/r#5' })).toBeDefined()
  expect(await ui.find({ key: 'direct-approve-o/r#5' })).toBeUndefined()
  expect((await ui.find({ type: 'Link', text: /Open on GitHub/ }))?.props.href).toBe('https://github.com/o/r/pull/5/files')
  await ui.unmount()
})

test('reviews auto review stored gather in a folding Auto review done group under the switch, and Check all sends them back to their requests', AUTO_ON, async ($, on) => {
  const label = async (key: string) => (await ui.find({ key }))?.props.label
  const ui = await opened($, on, [], [], 'review', { items: [autoItem, recent(6)], files: { [AUTO]: reviewed }, run: github([], 'h5') })

  expect(await label('fold-review:auto')).toBe('▾ Auto review done 1')
  expect(await label('fold-review:direct')).toBe('▾ Direct requests 1')
  expect(await ui.find({ key: 'direct-post-changes-o/r#5' })).toBeDefined()

  await ui.press({ key: 'fold-review:auto' })
  expect(await ui.find({ key: 'direct-post-changes-o/r#5' })).toBeUndefined()
  await ui.press({ key: 'fold-review:auto' })

  await ui.press({ key: 'auto-check-all' })
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].checked).toBe(true)
  expect(await ui.find({ key: 'fold-review:auto' })).toBeUndefined()
  expect(await label('fold-review:direct')).toBe('▾ Direct requests 2')
  // The stored review stays on its card, to post or discard.
  expect(await ui.find({ key: 'direct-post-changes-o/r#5' })).toBeDefined()
  await ui.unmount()
})

test('a post asks on the card, then submits my pending review with the verdict picked, and the card leaves auto review', AUTO_ON, async ($, on) => {
  const sent: string[] = []
  const ui = await opened($, on, [], [], 'review', { items: [autoItem], files: { [AUTO]: reviewed }, run: github(sent, 'h5') })

  await ui.press({ key: 'direct-post-comment-o/r#5' })
  expect(await shown(ui, /Post the auto review on o\/r#5 "r5" as me, as a comment/)).toBe(true)
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual(['-X POST repos/o/r/pulls/5/reviews/77/events -f event=COMMENT'])
  expect(await shown(ui, /✓ Posted/)).toBe(true)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].status).toBe('closed')
  expect(await shown(ui, /Auto review suggests/)).toBe(false)
  expect(await ui.find({ key: 'direct-post-changes-o/r#5' })).toBeUndefined()
  await ui.unmount()
})

test('new commits since the review stop a post and keep the pending review, while a discard deletes it whatever the head', AUTO_ON, async ($, on) => {
  const sent: string[] = []
  const ui = await opened($, on, [], [], 'review', { items: [autoItem], files: { [AUTO]: reviewed }, run: github(sent, 'h6') })

  await ui.press({ key: 'direct-post-changes-o/r#5' })
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual([])
  expect(await shown(ui, /New commits since you looked/)).toBe(true)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].reviewId).toBe(77)

  await ui.press({ key: 'direct-discard-o/r#5' })
  expect(await shown(ui, /Delete me's pending review on o\/r#5 "r5"/)).toBe(true)
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual(['-X DELETE repos/o/r/pulls/5/reviews/77'])
  expect(await shown(ui, /✓ Pending review deleted/)).toBe(true)
  expect(JSON.parse(files.get(AUTO)!).jobs['o/r#5'].status).toBe('closed')
  await ui.unmount()
})

test('with Direct GitHub actions on, a card with my pending review offers Post and approve in place of Approve, which GitHub would refuse', { options: { autoReview: 'on', directActions: 'on' } }, async ($, on) => {
  const sent: string[] = []
  const pending = queued({ status: 'done', reviewId: 9 })
  const ui = await opened($, on, [], [], 'review', { items: [autoItem], files: { [AUTO]: pending }, run: github(sent, 'h5') })

  expect(await ui.find({ key: 'direct-approve-o/r#5' })).toBeUndefined()
  await ui.press({ key: 'direct-post-approve-o/r#5' })
  await clock.advance(300)
  await ui.press({ key: 'direct-confirm-o/r#5' })
  expect(sent).toEqual(['-X POST repos/o/r/pulls/5/reviews/9/events -f event=APPROVE'])
  await ui.unmount()
})

// The test kit has no drawer close, so what the close fills is pinned in the inbox tests.
test('Refine in session takes the place of Review on a card with my pending review, and adds the card like Review', AUTO_ON, async ($, on) => {
  const ui = await opened($, on, [], [], 'review', { items: [autoItem, item(6)], files: { [AUTO]: reviewed }, run: github([], 'h5') })

  const label = async (key: string) => (await ui.find({ key }))?.props.label
  expect(await label('review-o/r#6')).toBe('Review with Claude')
  expect(await label('review-o/r#5')).toBe('Refine in session')
  await ui.press({ key: 'review-o/r#5' })
  expect(await label('review-o/r#5')).toBe('Added')
  await ui.unmount()
})

test("the reviewer's agent type is kept out of the model's listing", AUTO_ON, async ($, on) => {
  const ui = await opened($, on, [], [], 'review')
  const offer = await $.agent.offer({ agent: 'review-inbox:auto-reviewer', description: 'd', source: 'plugin', provider: { plugin: 'review-inbox', tier: 'user' } } as never)
  expect(offer.isOffered).toBe(false)
  await ui.unmount()
})

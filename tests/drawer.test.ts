import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Activity, GroupResult, InboxItem, IssueItem, MyPr, Presence, Thread } from '../types'
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
    // Answers a command, joined by spaces; anything it leaves fails as if missing.
    run?: (args: string) => { exitCode: number; stdout?: string; stderr?: string } | undefined
  } = {},
) {
  clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me', ...more.env })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('session.id', async () => ({ value: 'self' }))
  on('session.cwd', async () => ({ value: '/work/review-inbox' }))
  on('ui.panes', async () => ({ value: [] }))
  on('command.register', async () => ({ value: { command: 'review-inbox' } }))
  const store = new Map([[INBOX, JSON.stringify({ items: more.items ?? [], mine, issues, groups: more.groups ?? {}, activity: more.activity, fetchedAt: Date.now() })]])
  if (more.sessions) store.set(SESSIONS, JSON.stringify(more.sessions))
  for (const [path, text] of Object.entries(more.files ?? {})) store.set(path, text)
  on('fs.exists', async ($, e) => ({ value: store.has(e.path) }))
  on('fs.read', async ($, e) => ({ value: store.get(e.path)! }))
  on('fs.write', async ($, e) => {
    store.set(e.path, e.text)
    return { value: undefined }
  })
  on('process.run', async ($, e) => {
    const answer = more.run?.(e.argv.join(' '))
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

test('a hidden PR of mine leaves its tab, and show all brings it back', async ($, on) => {
  const ui = await opened($, on, [pr(1, 'changes'), pr(2, 'waiting')], [], 'mine')

  await ui.press({ key: 'more-pr:u1' })
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
  expect(text).toContain('Of my own: 0 buttons, 0 search groups')
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
  expect(fills[1]).toStartWith('Add a search group to my review inbox')
  await ui.unmount()
})

test('the Searches tab shows each group with its newest results, a failed one with its error, and a new one as loading', async ($, on) => {
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

  expect(await label('tab-searches')).toBe('Searches 25')
  expect(await shown(ui, /acme\/app #7/)).toBe(true)
  expect(await shown(ui, /kim · today/)).toBe(true)
  expect(await shown(ui, /24 more on GitHub/)).toBe(true)
  expect(await shown(ui, /Search failed: HTTP 403: no/)).toBe(true)
  expect(await label('fold-searches:bugs')).toBe('▾ Bugs …')
  await ui.press({ key: 'fold-searches:team' })
  expect(await shown(ui, /acme\/app #7/)).toBe(false)
  await ui.unmount()
})

test('a search group counted in the band adds Searches N to it; the others do not', async ($, on) => {
  const own = { groups: [{ id: 'team', name: 'Team PRs', query: 'org:acme', scope: 'prs', countInBand: true }] }
  const groups = {
    team: { query: 'org:acme is:pr sort:updated-desc', count: 3, hits: [] },
    'involves-me': { query: 'is:open involves:@me -author:@me is:pr sort:updated-desc', count: 40, hits: [] },
  }
  const pane = await opened($, on, [pr(1, 'changes')], [], 'mine', { files: { [ACTIONS]: JSON.stringify(own) }, groups })
  await pane.unmount()
  const band = await $.ui.mount({ plugin: 'review-inbox', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false, isWorking: false, maxRows: 10 } })

  expect(await shown(band, /My PRs to act on 1/)).toBe(true)
  expect(await shown(band, /Searches 3/)).toBe(true)
  await band.unmount()
})

const thread = (id: string, over: Partial<Thread> = {}): Thread =>
  ({ id, repo: 'o/n', title: `n${id}`, url: `https://github.com/o/n/issues/${id}`, reason: 'comment', updatedAt: '2026-10-22T00:00:00Z', unread: false, ...over })

test('the Activity tab lists the notifications no other tab covers, and Done waits out its Undo before it is sent', async ($, on) => {
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

  expect(await label('tab-activity')).toBe('Activity 2 ●')
  expect(await shown(ui, /● o\/n/)).toBe(true)
  expect(await shown(ui, /State changed · /)).toBe(true)
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
  expect(await label('tab-activity')).toBe('Activity 1')

  await ui.press({ key: 'unsubscribe-2' })
  await clock.advance(10_000)
  expect(sent).toEqual(['notifications/threads/1', 'notifications/threads/2/subscription'])
  expect(await shown(ui, /Could not update the notification: gh: Not Found \(HTTP 404\)/)).toBe(true)
  expect(await ui.find({ key: 'done-2' })).toBeDefined()
  await ui.unmount()
})

test('without access to notifications the Activity tab says how to get it', async ($, on) => {
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

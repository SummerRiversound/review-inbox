import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { INBOX_FORMAT, cacheKey } from '../hooks/inbox'

// Where the mod keeps the inbox for HOME=/home/me with no scope, no account and English.
const INBOX = `/home/me/.claude/plugins/data/review-inbox/inbox-${cacheKey('', '', 'en')}-f${INBOX_FORMAT}.json`

const ran = (exitCode: number, stderr = '') => ({ exitCode, stdout: '', stderr, isStdoutTruncated: false, isStderrTruncated: false })

// One session over files in memory, with gh offline and mv present or not, as on Windows.
function session(on: On, hasMv: boolean) {
  const clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me' })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('ui.panes', async () => ({ value: [] }))
  on('command.register', async () => ({ value: undefined }))
  // As the issue found it: the claim write cut short a minute ago, a NUL where the closing brace belongs.
  const files = new Map([[INBOX, { text: '{"items":[],"fetchingSince":1,"fetchingBy":"gone"\0', mtimeMs: Date.now() - 60_000 }]])
  const file = (path: string) => {
    const found = files.get(path)
    if (!found) throw new Error(`ENOENT: ${path}`)
    return found
  }
  on('fs.exists', async ($, e) => ({ value: files.has(e.path) }))
  on('fs.read', async ($, e) => ({ value: file(e.path).text }))
  on('fs.stat', async ($, e) => ({ value: { kind: 'file' as const, size: file(e.path).text.length, mtimeMs: file(e.path).mtimeMs, isLink: false } }))
  on('fs.write', async ($, e) => {
    files.set(e.path, { text: e.text, mtimeMs: Date.now() })
    return { value: undefined }
  })
  on('process.run', async ($, e) => {
    const [command, from, to] = e.argv.filter(arg => arg !== '-f')
    if (command === 'mv' && !hasMv) throw new Error('mv: command not found')
    if (command === 'mv' && from !== undefined && to !== undefined) {
      files.set(to, file(from))
      files.delete(from)
      return { value: ran(0) }
    }
    // gh is offline, so the fetch fails and its error is what the mod writes over the broken file.
    return { value: ran(1, 'offline') }
  })
  return { clock, files, file }
}

for (const hasMv of [true, false]) {
  test(`an inbox file left half written is fetched again and replaced${hasMv ? '' : ' where mv is missing'}`, async ($, on) => {
    const { clock, files, file } = session(on, hasMv)

    await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
    for (let i = 0; i < 10; i++) await clock.advance(1_000)

    expect(JSON.parse(file(INBOX).text).error).toBe('offline')
    expect([...files.keys()]).toEqual([INBOX])
  })
}

const page = (nodes: unknown[]) => JSON.stringify({ viewer: { login: 'me' }, search: { pageInfo: { hasNextPage: false }, nodes } })
const myGqlPr = {
  repository: { nameWithOwner: 'o/r' }, number: 1, title: 't', url: 'u1', isDraft: false, createdAt: '2026-10-01T00:00:00Z',
  reviewDecision: null, mergeable: 'MERGEABLE', commits: { nodes: [] }, reviews: { nodes: [] },
}

// A session with nothing fetched yet, whose review-request search fails, or answers only when `answer` is called.
function slowReviews(on: On, reviews: 'hang' | 'fail') {
  const clock = mock.clock(on)
  mock.env(on, { HOME: '/home/me' })
  on('settings.read', async () => ({ value: {} }))
  on('session.start', async () => ({ cwd: '/work' }))
  on('session.id', async () => ({ value: 'self' }))
  on('ui.panes', async () => ({ value: [] }))
  on('command.register', async () => ({ value: undefined }))
  const files = new Map<string, string>()
  on('fs.exists', async ($, e) => ({ value: files.has(e.path) }))
  on('fs.read', async ($, e) => {
    if (!files.has(e.path)) throw new Error(`ENOENT: ${e.path}`)
    return { value: files.get(e.path)! }
  })
  on('fs.write', async ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  let answer = () => {}
  on('process.run', async ($, e) => {
    const args = e.argv.join(' ')
    if (!args.startsWith('gh api graphql')) return { value: ran(1, 'offline') }
    if (args.includes('q=is:pr is:open review-requested:@me')) {
      if (reviews === 'fail') return { value: ran(1, 'offline') }
      await new Promise<void>(resolve => (answer = resolve))
    }
    const nodes = args.includes('is:pr is:open author:@me') ? [myGqlPr] : []
    return { value: { ...ran(0), stdout: page(nodes) } }
  })
  return { clock, inbox: () => JSON.parse(files.get(INBOX) ?? '{}'), answer: () => answer() }
}

test('a list GitHub has answered is shown while a slower one is still being fetched', async ($, on) => {
  const { clock, inbox, answer } = slowReviews(on, 'hang')

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  for (let i = 0; i < 10; i++) await clock.advance(1_000)

  expect(inbox().mine.map((pr: { url: string }) => pr.url)).toEqual(['u1'])
  expect(inbox().fetchingSince).toBeDefined()
  expect(inbox().fetchedAt).toBeUndefined()

  answer()
  for (let i = 0; i < 3; i++) await clock.advance(1_000)
  expect(inbox().fetchedAt).toBeDefined()
  expect(inbox().fetchingSince).toBeUndefined()
})

test('a fetch that fails partway keeps the lists it did get, with the error', async ($, on) => {
  const { clock, inbox } = slowReviews(on, 'fail')

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  for (let i = 0; i < 10; i++) await clock.advance(1_000)

  expect(inbox().error).toBe('offline')
  expect(inbox().mine.map((pr: { url: string }) => pr.url)).toEqual(['u1'])
})

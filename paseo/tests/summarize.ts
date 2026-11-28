import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerOf, printArgs } from '../server/ask'
import { summarizer } from '../server/summarize'
import type { PrDetail, SearchHit } from '../shared/inbox'

const hit = { title: 'Add search', repository: { nameWithOwner: 'o/r' } } as SearchHit
const detail = { headRefOid: 'h1', changedFiles: 1, additions: 1, deletions: 0, body: 'Adds a search box.' } as PrDetail
const fail = async () => {
  throw new Error('no gh here')
}

test('a summary is the model’s JSON answer, read with the mod’s rules', async () => {
  const s = summarizer(async () => '{"summary": "Adds a search box", "why": "Lists are long", "impact": [{"text": "List screen", "warn": false}]}', fail, {}, 'en')
  assert.deepEqual(await s.summary(hit, detail, undefined), { summary: 'Adds a search box', why: 'Lists are long', impact: [{ text: 'List screen', warn: false }] })
})

test('no answer or an unreadable one keeps the title and counts the try, so the next fetch asks again', async () => {
  for (const answer of [null, 'not json']) {
    const got = await summarizer(async () => answer, fail, {}, 'en').summary(hit, detail, undefined)
    assert.equal(got.summary, 'Add search')
    assert.equal(got.summaryFailed, 1)
  }
})

test('what changed since my review reads the compare under the account’s token, and a failed compare leaves it out', async () => {
  const asked: { args: string; token?: string }[] = []
  const gh = async (args: string[], env: Record<string, string>) => {
    asked.push({ args: args.join(' '), token: env.GH_TOKEN })
    return JSON.stringify({ commits: ['Fix the empty state'], files: ['list.ts'] })
  }
  const since = summarizer(async (_, prompt) => (prompt.includes('Fix the empty state') ? ' The empty list now says so. ' : null), gh, { GH_TOKEN: 't' }, 'en').since
  assert.equal(await since('o/r', 'a', 'b'), 'The empty list now says so.')
  assert.deepEqual(asked, [{ args: "api repos/o/r/compare/a...b --jq {commits: [.commits[].commit.message], files: [.files[].filename]}", token: 't' }])
  assert.equal(await summarizer(async () => 'x', fail, {}, 'en').since('o/r', 'a', 'b'), undefined)
})

test('the summary call runs with none of the person’s setup and no tools, and saves no session', () => {
  const args = printArgs('SYSTEM')
  for (const flag of ['--print', '--safe-mode', '--strict-mcp-config', '--no-session-persistence']) assert.ok(args.includes(flag), flag)
  const value = (flag: string) => args[args.indexOf(flag) + 1]
  assert.equal(value('--tools'), '')
  assert.equal(value('--setting-sources'), '')
  assert.equal(value('--system-prompt'), 'SYSTEM')
  // The prompt goes on stdin: as an argument, the CLI waits 3 s for stdin that never comes.
  assert.equal(args.at(-1), 'SYSTEM')
})

test('only a successful print is an answer', () => {
  assert.equal(answerOf(JSON.stringify({ is_error: false, result: '{}' })), '{}')
  assert.equal(answerOf(JSON.stringify({ is_error: true, result: 'x' })), null)
  assert.equal(answerOf('{"type":"res'), null)
})

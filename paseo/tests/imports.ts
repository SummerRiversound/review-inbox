import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'

const root = join(import.meta.dirname, '..')
// What Paseo gives a plugin installed from Git, which has no node_modules of its own.
const PROVIDED = /^(node:|@getpaseo\/plugin(\/|$)|react$|react-native$|zod$|@tanstack\/react-query$)/
const SKIP = new Set(['node_modules', 'tests', 'check', 'assets'])

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? (SKIP.has(e.name) ? [] : files(join(dir, e.name))) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  )

test('the plugin imports only what Paseo provides, type imports included, so a Git install builds', () => {
  for (const path of files(root)) {
    for (const [, spec] of readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*\(?\s*'([^'.][^']*)'/g)) {
      assert.match(spec!, PROVIDED, `${relative(root, path)} imports ${spec}`)
    }
  }
})

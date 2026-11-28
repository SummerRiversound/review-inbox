import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

// Every client file, nested folders included, since the app runs them on phones as well as in the browser.
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []))
const client = files(join(import.meta.dirname, '..', 'client')).map(path => ({ path, text: readFileSync(path, 'utf8') }))

test('the screens take every colour from the Paseo theme, so light, dark and plugin themes all apply', () => {
  for (const { path, text } of client) assert.doesNotMatch(text, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, path)
})

test('the screens use no browser-only code, which would break the app on phones', () => {
  for (const { path, text } of client) assert.doesNotMatch(text, /\bdocument\.|\bwindow\.|localStorage|navigator\.|className=|onClick=/, path)
})

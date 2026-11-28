import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { test } from 'node:test'

// The plugin runs the shared files outside Claude Code, so each must load with nothing of the mod around it.
test('every shared file loads outside the mod', async () => {
  const dir = new URL('../shared/', import.meta.url)
  const files = (await readdir(dir)).filter(f => f.endsWith('.ts') && f !== 'types.ts')
  assert.ok(files.length > 10)
  for (const f of files) await import(new URL(f, dir).href)
})

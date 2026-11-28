import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GH_MISSING } from '../shared/fetch'
import { spawnFailure } from '../server/gh'

test('a machine without gh gets setup help, and any other start failure keeps its message', () => {
  assert.equal(spawnFailure(Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' })), GH_MISSING)
  assert.equal(spawnFailure(Object.assign(new Error('spawn gh EACCES'), { code: 'EACCES' })), 'spawn gh EACCES')
})

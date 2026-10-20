import { expect, test } from 'claude-code/testing'

import type { Note } from '../types'
import { NOTE_KEEP_MS, isSnoozed, keptNotes, matches, snoozeUntil } from '../hooks/notes'

test('a snooze ends at nine in the morning, tomorrow or on the next Monday', async () => {
  // Tuesday 2026-10-20, late evening.
  const tuesday = new Date(2026, 9, 20, 23, 30)
  expect(new Date(snoozeUntil('tomorrow', tuesday))).toEqual(new Date(2026, 9, 21, 9))
  expect(new Date(snoozeUntil('nextWeek', tuesday))).toEqual(new Date(2026, 9, 26, 9))
  // From a Monday, next week is the Monday after.
  expect(new Date(snoozeUntil('nextWeek', new Date(2026, 9, 26, 8)))).toEqual(new Date(2026, 10, 2, 9))
})

test('a snoozed card stays away until its day, or until it has the news that would end a hide', async () => {
  const note: Note = { text: 'Friday with Kim', savedAt: 0, until: 100, mark: 'sha1' }
  const quiet = (h: Record<string, string>) => h.k === 'sha1'
  expect(isSnoozed(note, 'k', 50, quiet)).toBe(true)
  expect(isSnoozed(note, 'k', 100, quiet)).toBe(false)
  expect(isSnoozed(note, 'k', 50, h => h.k === 'sha2')).toBe(false)
  expect(isSnoozed({ text: 'just a note', savedAt: 0 }, 'k', 50, quiet)).toBe(false)
  expect(isSnoozed(undefined, 'k', 50, quiet)).toBe(false)
})

test('every word of the search must appear somewhere on the card, in any case', async () => {
  const card = ['o/r #12', 'Fix login redirect', undefined, 'The callback URL lost its query string']
  expect(matches('LOGIN', card)).toBe(true)
  expect(matches('#12 query', card)).toBe(true)
  expect(matches('login payment', card)).toBe(false)
  expect(matches('  ', card)).toBe(true)
})

test('a note outlives its card for 60 days, then goes', async () => {
  const now = 10 * NOTE_KEEP_MS
  const notes: Record<string, Note> = {
    live: { text: 'a', savedAt: 0 },
    recent: { text: 'b', savedAt: now - NOTE_KEEP_MS + 1 },
    stale: { text: 'c', savedAt: now - NOTE_KEEP_MS },
  }
  expect(Object.keys(keptNotes(notes, new Set(['live']), now))).toEqual(['live', 'recent'])
})

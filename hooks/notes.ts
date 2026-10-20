import type { Note } from '../types'

// shortcut: the first 2,000 characters of a body are searched; raise it if bodies are searched past that, mindful of gh's 4 MiB output cap
export const BODY_CHARS = 2_000
// A note outlives its card this long, so a PR that drops off a list and comes back keeps it.
export const NOTE_KEEP_MS = 60 * 86_400_000

// Nine in the morning, local time: tomorrow, or the next Monday.
export function snoozeUntil(when: 'tomorrow' | 'nextWeek', now: Date): number {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9)
  if (when === 'nextWeek') while (day.getDay() !== 1) day.setDate(day.getDate() + 1)
  return day.getTime()
}

// Away until its day, or sooner when the card has the news that would end a hide: `stillHidden` is that card's hide test.
export function isSnoozed(
  note: Note | undefined,
  key: string,
  now: number,
  stillHidden: (hidden: Record<string, string>) => boolean,
): boolean {
  return note?.until !== undefined && note.mark !== undefined && now < note.until && stillHidden({ [key]: note.mark })
}

export function matches(query: string, fields: (string | undefined)[]): boolean {
  const text = fields.filter(Boolean).join('\n').toLowerCase()
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(word => text.includes(word))
}

export function keptNotes(notes: Record<string, Note>, live: Set<string>, now: number): Record<string, Note> {
  return Object.fromEntries(Object.entries(notes).filter(([key, note]) => live.has(key) || now - note.savedAt < NOTE_KEEP_MS))
}

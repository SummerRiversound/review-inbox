import { expect, test } from 'claude-code/testing'

import { MESSAGES, pickLanguage } from '../hooks/i18n'

// Every key path, with a function's arity, so a missing or misshapen Korean entry fails here and not on screen.
function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'function') return [`${path}/${value.length}`]
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, v]) => shape(v, `${path}.${key}`)).sort()
  }
  return [path]
}

test('the Korean table has every key the English one has, and nothing more', async () => {
  expect(shape(MESSAGES.ko)).toEqual(shape(MESSAGES.en))
})

test('every PR state and issue kind has a label in both languages', async () => {
  for (const m of [MESSAGES.en, MESSAGES.ko]) {
    expect(Object.keys(m.state).sort()).toEqual(['approved', 'changes', 'ci-failing', 'conflict', 'draft', 'waiting'])
    expect(Object.keys(m.issueKind).sort()).toEqual(['assigned', 'mention', 'reference'])
  }
})

test('the language option wins over the Claude Code setting and the system locale', async () => {
  expect(pickLanguage('en', '한국어', 'ko_KR.UTF-8')).toBe('en')
  expect(pickLanguage('ko', 'English', 'en_US.UTF-8')).toBe('ko')
})

test('auto follows the Claude Code language setting, written any way, then the locale, then English', async () => {
  for (const setting of ['한국어', '한글', 'Korean', 'korean', 'ko', 'kor', 'ko-KR', ' KO ']) {
    expect(pickLanguage('auto', setting, 'en_US.UTF-8')).toBe('ko')
  }
  expect(pickLanguage('auto', 'English', 'ko_KR.UTF-8')).toBe('en')
  expect(pickLanguage('auto', 'eng', 'ko_KR.UTF-8')).toBe('en')
  expect(pickLanguage('auto', undefined, 'ko_KR.UTF-8')).toBe('ko')
  expect(pickLanguage('auto', 'Japanese', 'ko_KR.UTF-8')).toBe('ko')
  expect(pickLanguage('auto', 'Japanese', 'C.UTF-8')).toBe('en')
  expect(pickLanguage(undefined, undefined, undefined)).toBe('en')
  // Not Korean just because it starts with the letters.
  expect(pickLanguage('auto', 'kotlin', undefined)).toBe('en')
})

test('English counts read naturally for one and for many', async () => {
  const { en } = MESSAGES
  expect([en.card.waiting(1), en.card.waiting(3)]).toEqual(['1 day', '3 days'])
  expect([en.card.ago(0), en.card.ago(1)]).toEqual(['today', '1 day ago'])
  expect(en.card.size(1, '10', '2')).toBe('1 file (+10 −2)')
  expect([en.toast.moreRequests(1), en.toast.moreRequests(2)]).toEqual(['1 more review request', '2 more review requests'])
})

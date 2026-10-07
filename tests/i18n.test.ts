import { expect, test } from 'claude-code/testing'

import { LANGUAGES, MESSAGES, pickLanguage } from '../hooks/i18n'

// Every key path, with a function's arity, so a missing or misshapen entry fails here and not on screen.
function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'function') return [`${path}/${value.length}`]
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, v]) => shape(v, `${path}.${key}`)).sort()
  }
  return [path]
}

function functions(value: unknown, path = ''): [string, (...args: unknown[]) => unknown][] {
  if (typeof value === 'function') return [[path, value as (...args: unknown[]) => unknown]]
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, v]) => functions(v, `${path}.${key}`))
  }
  return []
}

test('every table has every key the English one has, and nothing more', async () => {
  for (const language of LANGUAGES) expect(shape(MESSAGES[language])).toEqual(shape(MESSAGES.en))
})

test('every table other than English is translated', async () => {
  const { en } = MESSAGES
  for (const language of LANGUAGES.filter(l => l !== 'en')) {
    const m = MESSAGES[language]
    for (const [mine, english] of [
      [m.empty.review, en.empty.review],
      [m.status.firstFetch, en.status.firstFetch],
      [m.toast.promptBusy, en.toast.promptBusy],
      [m.model.good, en.model.good],
      [m.card.added, en.card.added],
      [m.prompt.style, en.prompt.style],
    ]) {
      expect(mine).not.toBe(english)
    }
  }
})

// A dropped or misplaced argument shows up as a missing number.
test('every string a table builds shows each number and name it is given', async () => {
  for (const language of LANGUAGES) {
    for (const [, fn] of functions(MESSAGES[language])) {
      for (const n of [2, 12]) {
        const out = String(fn(...Array(fn.length).fill(n)))
        expect(out.includes(String(n))).toBe(true)
        expect(/undefined|NaN/.test(out)).toBe(false)
      }
    }
  }
})

test('every PR state and issue kind has a label in every language', async () => {
  for (const m of LANGUAGES.map(l => MESSAGES[l])) {
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
  expect(pickLanguage('auto', 'Italiano', 'ko_KR.UTF-8')).toBe('ko')
  expect(pickLanguage('auto', 'Italian', 'C.UTF-8')).toBe('en')
  expect(pickLanguage(undefined, undefined, undefined)).toBe('en')
  // Not Korean just because it starts with the letters.
  expect(pickLanguage('auto', 'kotlin', undefined)).toBe('en')
  expect(pickLanguage('auto', 'default', 'deutsch')).toBe('de')
})

test('auto recognizes each supported language by its code, its English name and its own name', async () => {
  const cases: [string, string[]][] = [
    ['ja', ['ja', 'ja-JP', 'Japanese', '日本語', 'ja_JP.UTF-8']],
    ['zh-CN', ['zh', 'zh-CN', 'zh-Hans', 'Chinese', '中文', '简体中文', 'zh_CN.UTF-8', 'Simplified Chinese']],
    ['zh-TW', ['zh-TW', 'zh-HK', 'zh-Hant', 'zh_TW.UTF-8', '繁體中文', '中文（繁體）', 'Traditional Chinese', 'Chinese (Traditional)']],
    ['es', ['es', 'es-419', 'Spanish', 'Español', 'espanol', 'es_ES.UTF-8']],
    ['pt-BR', ['pt', 'pt-BR', 'pt_PT', 'Portuguese', 'Português', 'pt_BR.UTF-8']],
    ['de', ['de', 'de-DE', 'German', 'Deutsch', 'de_AT.UTF-8']],
    ['fr', ['fr', 'fr-CA', 'French', 'Français', 'francais', 'fr_FR.UTF-8']],
  ]
  for (const [language, values] of cases) {
    for (const value of values) expect(pickLanguage('auto', value, undefined)).toBe(language)
  }
  for (const option of LANGUAGES) expect(pickLanguage(option, 'English', 'en_US.UTF-8')).toBe(option)
  // Codes that merely start like a language name nothing.
  for (const value of ['default', 'estonian', 'javascript', 'chip', 'dev']) {
    expect(pickLanguage('auto', value, undefined)).toBe('en')
  }
})

test('English counts read naturally for one and for many', async () => {
  const { en } = MESSAGES
  expect([en.card.waiting(1), en.card.waiting(3)]).toEqual(['1 day', '3 days'])
  expect([en.card.ago(0), en.card.ago(1)]).toEqual(['today', '1 day ago'])
  expect(en.card.size(1, '10', '2')).toBe('1 file (+10 −2)')
  expect([en.toast.moreRequests(1), en.toast.moreRequests(2)]).toEqual(['1 more review request', '2 more review requests'])
})

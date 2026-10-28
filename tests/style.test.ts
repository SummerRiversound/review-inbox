import { expect, test } from 'claude-code/testing'

import { STYLE_MS, STYLE_RULES, learnedStyle, parseStyle, shouldBuildStyle, stylePrompt, styleQuery, styleRules, styleSamples } from '../hooks/style'

const review = (login: string | null, body: string, comments: string[] = []) => ({
  author: login === null ? null : { login },
  body,
  comments: { nodes: comments.map(body => ({ body })) },
})

test('style samples are my own review bodies and inline comments, blanks left out', async () => {
  const nodes = [
    { reviews: { nodes: [review('Me', ' Looks good, one question. ', ['Why a new cache here?', '  ']), review('other', 'LGTM')] } },
    {},
    { reviews: { nodes: [review(null, 'ghost'), review('me', '', ['Can this be a constant?'])] } },
  ]
  expect(styleSamples(nodes, 'me')).toEqual(['Looks good, one question.', 'Why a new cache here?', 'Can this be a constant?'])
})

test('an auto review posted under my name is not learned from, its inline comments included', async () => {
  const auto = review('me', 'Approving.\n\n<!-- review-inbox auto-review sha=abc key=k -->', ['A finding the reviewer wrote.'])
  expect(styleSamples([{ reviews: { nodes: [auto, review('me', 'Why a new cache here?')] } }], 'me')).toEqual(['Why a new cache here?'])
})

test('style samples are cut to 500 characters each and stop at 60', async () => {
  const many = Array.from({ length: 70 }, (_, i) => `comment ${i}`)
  const samples = styleSamples([{ reviews: { nodes: [review('me', 'x'.repeat(900), many)] } }], 'me')
  expect(samples[0]).toBe('x'.repeat(500))
  expect(samples.length).toBe(60)
})

test('fewer than five samples ask the model nothing', async () => {
  expect(stylePrompt(['a', 'b', 'c', 'd'])).toBeUndefined()
  const prompt = stylePrompt(['a', 'b', 'c', 'd', 'Why a new cache here?'])
  expect(prompt?.includes('Why a new cache here?')).toBe(true)
})

test('the style is learned once a week, and a day after a failure', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  expect(shouldBuildStyle({}, now)).toBe(true)
  expect(shouldBuildStyle({ rules: STYLE_RULES, checkedAt: now - STYLE_MS + 1 }, now)).toBe(false)
  expect(shouldBuildStyle({ rules: STYLE_RULES, checkedAt: now - STYLE_MS }, now)).toBe(true)
  expect(shouldBuildStyle({ profile: 'p', checkedAt: now - 30 * STYLE_MS, retryAt: now + 1 }, now)).toBe(false)
  expect(shouldBuildStyle({ profile: 'p', checkedAt: now - 30 * STYLE_MS, retryAt: now }, now)).toBe(true)
})

test('a style learned under older rules is learned again and not used meanwhile', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  expect(shouldBuildStyle({ profile: 'p', checkedAt: now - 1 }, now)).toBe(true)
  expect(learnedStyle({ profile: 'p', checkedAt: now - 1 })).toBeUndefined()
  expect(learnedStyle({ profile: 'p', rules: STYLE_RULES, checkedAt: now - 1 })).toBe('p')
  expect(learnedStyle(undefined)).toBeUndefined()
})

test('the style description leaves out greetings, praise and how a review is laid out', async () => {
  const rules = styleRules('en')
  for (const word of ['greetings', 'praise', 'order']) expect(rules.includes(word)).toBe(true)
})

test('a style reply becomes one line, and an empty one is no style', async () => {
  expect(parseStyle('  Short and direct.\n\nAsks   questions. ')).toBe('Short and direct. Asks questions.')
  expect(parseStyle(' \n ')).toBeUndefined()
  expect(parseStyle('x'.repeat(900))?.length).toBe(600)
})

test('the style is learned from PRs I reviewed and did not write, within the scope', async () => {
  expect(styleQuery(' org:acme ')).toBe('is:pr reviewed-by:@me -author:@me sort:updated-desc org:acme')
})

import { expect, test } from 'claude-code/testing'

import { builtInButtons, errorText, fillTemplate, mergeButtons, parseActions, unknownVariables } from '../hooks/actions'
import { MESSAGES } from '../hooks/i18n'

const m = MESSAGES.en

test('a template takes every spelling gh-dash takes, and a variable the card lacks becomes empty', () => {
  expect(fillTemplate('{{.PrUrl}} {{PrNumber}} {{ .RepoName }} [{{.HeadRefName}}]', { PrUrl: 'u', PrNumber: '5', RepoName: 'o/r' })).toBe('u 5 o/r []')
  expect(unknownVariables('{{.PrUrl}} {{.Nope}} {{Nope}} {{.Other}}')).toEqual(['Nope', 'Other'])
})

test('a broken entry is listed with its reason and the rest still load', () => {
  const { buttons, errors } = parseActions(
    JSON.stringify({
      buttons: [
        { id: 'ok', name: 'Ok', scope: 'pr', prompt: 'Look at {{.PrUrl}}' },
        { id: 'typo', name: 'Typo', scope: 'pr', prompt: 'Look at {{.PrLink}}' },
        { id: 'where', name: 'Where', scope: 'repo', prompt: 'x' },
        { name: 'No id', scope: 'pr', prompt: 'x' },
        { id: 'draft-approval', scope: 'review', hidden: true },
      ],
    }),
  )
  expect(buttons.map(b => b.id)).toEqual(['ok', 'draft-approval'])
  expect(errors.map(e => errorText(e, m))).toEqual([
    'typo: unknown variable PrLink',
    'where: scope "repo" is not review, pr or issue',
    '#4: needs an id, a name and a prompt',
  ])
})

test('a missing file is no buttons of mine, and a file that is not the right JSON is one error', () => {
  expect(parseActions(undefined)).toEqual({ buttons: [], errors: [] })
  expect(parseActions('{ nope').errors).toEqual([{ at: 'actions.json', reason: 'file' }])
  expect(parseActions('[]').errors).toEqual([{ at: 'actions.json', reason: 'file' }])
})

test('a button of mine with a built-in id replaces it, and hidden removes it', () => {
  const merged = mergeButtons(builtInButtons(m), [
    { id: 'explain-diff', name: 'Walk me through it', scope: 'review', prompt: 'Walk me through {{.PrUrl}}' },
    { id: 'draft-approval', name: '', scope: 'review', prompt: '', hidden: true },
    { id: 'mine', name: 'Mine', scope: 'issue', prompt: 'x' },
  ])
  expect(merged.map(b => b.name)).toEqual(['Summarize risks', 'Walk me through it', 'Draft reply to reviewer', 'Investigate CI failure', 'Mine'])
})

test('every built-in prompt in every language names only known variables', () => {
  for (const messages of Object.values(MESSAGES)) {
    for (const b of builtInButtons(messages)) expect(unknownVariables(b.prompt)).toEqual([])
  }
})

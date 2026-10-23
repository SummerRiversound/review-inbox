import { expect, test } from 'claude-code/testing'

import { builtInButtons, errorText, fillTemplate, mergeById, parseActions, unknownVariables } from '../hooks/actions'
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
  expect(parseActions(undefined)).toEqual({ buttons: [], groups: [], errors: [] })
  expect(parseActions('{ nope').errors).toEqual([{ at: 'actions.json', reason: 'file' }])
  expect(parseActions('[]').errors).toEqual([{ at: 'actions.json', reason: 'file' }])
  expect(parseActions('{"groups": {}}').errors).toEqual([{ at: 'actions.json', reason: 'file' }])
  expect(parseActions('{"groups": []}')).toEqual({ buttons: [], groups: [], errors: [] })
})

test('a button of mine with a built-in id replaces it, and hidden removes it', () => {
  const merged = mergeById(builtInButtons(m), [
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

test('search groups are read beside buttons, a broken one listed and the rest kept', () => {
  const { buttons, groups, errors } = parseActions(
    JSON.stringify({
      buttons: [{ id: 'ok', name: 'Ok', scope: 'pr', prompt: 'x' }],
      groups: [
        { id: 'team', name: 'Team', query: 'org:acme is:open', scope: 'prs', countInBand: true },
        { id: 'where', name: 'Where', query: 'x', scope: 'review' },
        { id: 'blank', name: 'Blank', query: '  ', scope: 'issues' },
        { name: 'No id', query: 'x', scope: 'prs' },
        { id: 'involves-me', hidden: true },
      ],
    }),
  )
  expect(buttons.map(b => b.id)).toEqual(['ok'])
  expect(groups).toEqual([
    { id: 'team', name: 'Team', query: 'org:acme is:open', scope: 'prs', countInBand: true },
    { id: 'involves-me', name: '', query: '', scope: 'prs', hidden: true },
  ])
  expect(errors.map(e => errorText(e, m))).toEqual([
    'where: search group scope "review" is not prs or issues',
    'blank: a search group needs an id, a name and a query',
    'groups #4: a search group needs an id, a name and a query',
  ])
})

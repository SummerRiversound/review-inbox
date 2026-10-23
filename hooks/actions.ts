import type { ButtonError, ButtonScope, CardButton } from '../types'
import type { Messages } from './i18n'

export const ACTIONS_FILE = 'actions.json'
// Past this many in one scope, the card's row of buttons stops being a glance.
export const MAX_PER_SCOPE = 20

export const VARIABLES = [
  'RepoName',
  'RepoPath',
  'PrNumber',
  'PrUrl',
  'PrTitle',
  'Author',
  'HeadRefName',
  'BaseRefName',
  'IssueNumber',
  'IssueTitle',
  'IssueUrl',
] as const
export type Variable = (typeof VARIABLES)[number]
export type Vars = Partial<Record<Variable, string>>

const SCOPES: readonly ButtonScope[] = ['review', 'pr', 'issue']

// gh-dash's spellings, {{.Name}}, {{Name}} and {{ .Name }}; no pipes or conditions.
const TEMPLATE = /\{\{\s*\.?\s*([A-Za-z]+)\s*\}\}/g

const isVariable = (name: string): name is Variable => (VARIABLES as readonly string[]).includes(name)

export function unknownVariables(prompt: string): string[] {
  return [...new Set([...prompt.matchAll(TEMPLATE)].map(match => match[1]!).filter(name => !isVariable(name)))]
}

// A variable the card has no value for becomes empty.
export function fillTemplate(prompt: string, vars: Vars): string {
  return prompt.replace(TEMPLATE, (_, name: string) => (isVariable(name) ? (vars[name] ?? '') : ''))
}

// Prompts reach Claude only through the prompt field: nothing here runs a command.
export const BUILT_IN: { id: keyof Messages['buttons']['builtIn']; scope: ButtonScope }[] = [
  { id: 'summarize-risks', scope: 'review' },
  { id: 'explain-diff', scope: 'review' },
  { id: 'draft-approval', scope: 'review' },
  { id: 'draft-reply', scope: 'pr' },
  { id: 'investigate-ci', scope: 'pr' },
]

export const builtInButtons = (m: Messages): CardButton[] => BUILT_IN.map(b => ({ ...b, ...m.buttons.builtIn[b.id] }))

// A missing file is no buttons of mine; a broken one, or a broken entry, is listed and leaves the rest working.
export function parseActions(text: string | undefined): { buttons: CardButton[]; errors: ButtonError[] } {
  if (text === undefined) return { buttons: [], errors: [] }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { buttons: [], errors: [{ at: ACTIONS_FILE, reason: 'file' }] }
  }
  const entries = (data as { buttons?: unknown } | null)?.buttons
  if (!Array.isArray(entries)) return { buttons: [], errors: [{ at: ACTIONS_FILE, reason: 'file' }] }

  const buttons: CardButton[] = []
  const errors: ButtonError[] = []
  entries.forEach((entry: Partial<Record<keyof CardButton, unknown>> | null, i) => {
    const at = typeof entry?.id === 'string' && entry.id ? entry.id : `#${i + 1}`
    const { id, name, scope, prompt, hidden } = entry ?? {}
    if (typeof id !== 'string' || !id) return errors.push({ at, reason: 'fields' })
    if (!SCOPES.includes(scope as ButtonScope)) return errors.push({ at, reason: 'scope', detail: String(scope) })
    if (hidden === true) return buttons.push({ id, name: '', scope: scope as ButtonScope, prompt: '', hidden: true })
    if (typeof name !== 'string' || !name || typeof prompt !== 'string' || !prompt) return errors.push({ at, reason: 'fields' })
    const unknown = unknownVariables(prompt)
    if (unknown.length > 0) return errors.push({ at, reason: 'variables', detail: unknown.join(', ') })
    buttons.push({ id, name, scope: scope as ButtonScope, prompt })
  })
  return { buttons, errors }
}

// A button of mine with a built-in id takes its place; `hidden` removes it.
export function mergeButtons(builtIn: CardButton[], mine: CardButton[]): CardButton[] {
  const byId = new Map(builtIn.map(b => [b.id, b]))
  for (const b of mine) byId.set(b.id, b)
  return [...byId.values()].filter(b => !b.hidden)
}

export function errorText(error: ButtonError, m: Messages): string {
  const reason = m.buttons.errors[error.reason]
  return `${error.at}: ${typeof reason === 'string' ? reason : reason(error.detail ?? '')}`
}

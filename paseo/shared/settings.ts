import { defineSettings } from '@getpaseo/plugin'
import { z } from 'zod'

// The mod's options under the same meaning: the search qualifiers every list adds, the gh account to
// read GitHub as (empty: gh's active account), and auto review's switch, reviewer, daily limit, wait and skills.
export const inboxSettings = defineSettings({
  id: 'inbox',
  scope: 'host',
  version: 1,
  schema: z.object({
    scope: z.string().default(''),
    githubUser: z.string().default(''),
    autoReview: z.boolean().default(false),
    // Paseo's provider/model, e.g. claude/claude-opus-5-5 or codex/gpt-5.5.
    reviewer: z.string().default('claude/claude-sonnet-5-5'),
    // Reviews started a day; null has no limit.
    daily: z.number().int().min(0).nullable().default(5),
    settleMinutes: z.number().int().min(0).default(30),
    skills: z.string().default(''),
  }),
})

export type InboxConfig = z.output<typeof inboxSettings.schema>
export const DEFAULT_CONFIG: InboxConfig = inboxSettings.schema.parse({})

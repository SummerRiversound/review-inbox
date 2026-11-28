import { defineSettings } from '@getpaseo/plugin'
import { z } from 'zod'

// What the mod's scope and githubUser options say: the search qualifiers every list adds, and the
// gh account to read GitHub as (empty: gh's active account).
export const inboxSettings = defineSettings({
  id: 'inbox',
  scope: 'host',
  version: 1,
  schema: z.object({ scope: z.string().default(''), githubUser: z.string().default('') }),
})

export type InboxConfig = { scope: string; githubUser: string }

import { defineRpc } from '@getpaseo/plugin'
import { z } from 'zod'
import type { AutoState, Capped, InboxItem, IssueItem, MyPr } from './types'

// The fetched lists as the mod keeps them: the panel draws them with the mod's own rules from ./shared.
// They come from this plugin's own server, so they are typed here and not checked field by field.
export const inboxView = z.object({
  // empty: nothing fetched yet; error: the last fetch failed, and the lists are the last good ones.
  status: z.enum(['empty', 'loading', 'ready', 'error']),
  fetchedAt: z.number().nullable(),
  error: z.string().nullable(),
  items: z.custom<InboxItem[]>(),
  mine: z.custom<MyPr[]>(),
  issues: z.custom<IssueItem[]>(),
  capped: z.custom<Capped>(),
  // Each review request's auto-review line by card key; empty while auto review is off.
  auto: z.custom<Record<string, AutoState>>(),
  // What I hid, by hide key, until the card changes.
  hidden: z.record(z.string(), z.string()),
  // The server sends a device notification for each new request; without it the app shows a toast.
  notifies: z.boolean(),
})

export type InboxView = z.infer<typeof inboxView>

export const inboxRpc = defineRpc({ name: 'inbox.read', input: z.object({}), output: inboxView })

// Fetch now instead of at the next interval; returns at once, the panel sees the fetch through inbox.read.
export const refreshRpc = defineRpc({ name: 'inbox.refresh', input: z.object({}), output: z.object({}) })

// Hides one card under its hide key and value (the mod's rule for its kind); no key shows every hidden card again.
export const hideRpc = defineRpc({ name: 'inbox.hide', input: z.object({ key: z.string().optional(), value: z.string().optional() }), output: z.object({}) })

import { defineRpc } from '@getpaseo/plugin'
import { z } from 'zod'

const row = z.object({
  key: z.string(),
  title: z.string(),
  repo: z.string(),
  number: z.number(),
  url: z.string(),
  author: z.string().nullable(),
  // review: draft or nothing; mine: what I have to do next; issues: why it is on the list.
  tag: z.string().nullable(),
})

export const inboxView = z.object({
  // empty: nothing fetched yet; error: the last fetch failed, and the lists are the last good ones.
  status: z.enum(['empty', 'loading', 'ready', 'error']),
  fetchedAt: z.number().nullable(),
  error: z.string().nullable(),
  review: z.array(row),
  mine: z.array(row),
  issues: z.array(row),
  // A list whose search had more results than one fetch reads.
  capped: z.object({ review: z.boolean(), mine: z.boolean(), issues: z.boolean() }),
})

export type InboxView = z.infer<typeof inboxView>
export type InboxRow = z.infer<typeof row>

// The three lists as the panel draws them.
export const inboxRpc = defineRpc({ name: 'inbox.read', input: z.object({}), output: inboxView })

// Fetch now instead of at the next interval; returns at once, the panel sees the fetch through inbox.read.
export const refreshRpc = defineRpc({ name: 'inbox.refresh', input: z.object({}), output: z.object({}) })

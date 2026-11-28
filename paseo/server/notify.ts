import { itemKey, newArrivals, shownReady } from '../shared/inbox'
import type { InboxConfig } from '../shared/settings'
import type { InboxFile } from '../shared/types'

export type Notice = { title: string; body: string; key: string; data: Record<string, string> }

// One notice per review request that is new since the last fetch; drafts wait until they are ready, as in the mod.
// The first fetch after install announces nothing: it has nothing to compare against.
export async function announce(
  config: InboxConfig,
  file: InboxFile | undefined,
  seen: { load: (config: InboxConfig) => Promise<string[] | undefined>; save: (config: InboxConfig, keys: string[]) => Promise<void> },
  send: (notice: Notice) => Promise<unknown>,
  title: (repo: string, number: number) => string,
): Promise<void> {
  if (file?.fetchedAt === undefined || file.error !== undefined) return
  const before = await seen.load(config)
  await seen.save(config, shownReady(file.items))
  for (const item of newArrivals(before, file.items))
    await send({ title: title(item.repo, item.number), body: `${item.author} · ${item.summary || item.title}`, key: `review:${itemKey(item)}@${item.headSha}`.slice(0, 128), data: { url: item.url } })
}

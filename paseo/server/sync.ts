import { fetchInbox, fetchTabs, type Gh, type Save, type Summarizer } from '../shared/fetch'
import { RETRY_MS, shouldFetch } from '../shared/inbox'
import type { InboxConfig } from '../shared/settings'
import type { InboxFile } from '../shared/types'

export type SyncDeps = {
  gh: Gh
  env: (githubUser: string) => Promise<Record<string, string>>
  // How a fetch summarizes the PRs it reads, under the account's environment.
  summarizer: (env: Record<string, string>) => Summarizer
  config: () => Promise<InboxConfig>
  load: (config: InboxConfig) => Promise<InboxFile | undefined>
  save: (config: InboxConfig, file: InboxFile) => Promise<void>
  now: () => number
  refreshMs: number
}

// The mod's fetch without its claim between sessions: one daemon fetches, one fetch at a time.
export function createSync(deps: SyncDeps) {
  let running: Promise<void> | null = null

  const run = async (force: boolean) => {
    const config = await deps.config()
    const file = (await deps.load(config)) ?? { items: [] }
    if (!shouldFetch(file, deps.now(), force, deps.refreshMs)) return

    // Each list is written as it arrives; writes go in order, and none after the fetch ends.
    let partial: InboxFile = file
    let saving = Promise.resolve()
    let isDone = false
    const save: Save = lists => {
      if (isDone) return saving
      partial = { ...partial, ...lists, capped: { ...partial.capped, ...lists.capped } }
      const next = partial
      saving = saving.then(() => deps.save(config, next)).catch(() => undefined)
      return saving
    }

    let result: InboxFile
    try {
      const env = await deps.env(config.githubUser)
      const [tabs, fetched] = await Promise.all([
        fetchTabs(deps.gh, config.scope, env, file.issues ?? [], save),
        fetchInbox(deps.gh, config.scope, env, file.items, deps.summarizer(env), () => save({})).then(async found => (await save({ items: found.items }), found)),
      ])
      result = { ...file, items: fetched.items, ...tabs, capped: { ...tabs.capped, review: fetched.capped }, fetchedAt: deps.now() }
      delete result.retryAt
      delete result.error
    } catch (error) {
      // Keep the lists this fetch did get, the last good ones otherwise, and try again in a minute.
      // A first fetch that failed keeps no time, so nothing reads as fetched.
      result = { ...partial, fetchedAt: file.fetchedAt, retryAt: deps.now() + RETRY_MS, error: error instanceof Error ? error.message : String(error) }
    }
    isDone = true
    await saving
    await deps.save(config, result)
  }

  return {
    // A call while one runs joins it, so a refresh pressed twice fetches once.
    sync: (force = false): Promise<void> => (running ??= run(force).finally(() => (running = null))),
    isFetching: () => running !== null,
  }
}

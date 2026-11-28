import type { PluginServerContext } from '@getpaseo/plugin/server'
import { gh, ghEnv } from './server/gh'
import { claudeAsk } from './server/ask'
import { LANGUAGE, loadInbox, saveInbox } from './server/store'
import { summarizer } from './server/summarize'
import { createSync } from './server/sync'
import { PASEO_ENV } from './shared/host'
import { REFRESH_MS } from './shared/inbox'
import { inboxRpc, refreshRpc } from './shared/rpc'
import { type InboxConfig, inboxSettings } from './shared/settings'
import { toView } from './shared/view'

// How often the plugin asks whether a fetch is due: the refresh interval and a failed fetch's retry decide.
const TICK_MS = 60_000

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(inboxSettings)
  const config = async (): Promise<InboxConfig> => {
    const read = await settings.read()
    return read.status === 'ready' ? read.values : { scope: '', githubUser: '' }
  }
  const { sync, isFetching } = createSync({ gh, env: user => ghEnv(gh, user), summarizer: env => summarizer(claudeAsk, gh, env, LANGUAGE), config, load: loadInbox, save: saveInbox, now: Date.now, refreshMs: REFRESH_MS })
  const fetch = (force: boolean) => void sync(force).catch(error => console.error('[review-inbox] fetch failed:', error))

  // Claude sessions Paseo opens carry the mark, so the review-inbox mod in them stops fetching.
  server.addHook('agent.open.before', async ({ request }) => (request.provider === 'claude' ? { ...request, env: { ...request.env, [PASEO_ENV]: '1' } } : request))

  server.handle(inboxRpc, async () => toView(await loadInbox(await config()), isFetching()))
  server.handle(refreshRpc, async () => (fetch(true), {}))

  // A changed account or scope reads its own file, fetched now; a notice with the same values changes nothing.
  let seen: string | undefined
  const stopSettings = settings.subscribe(state => {
    const now = state.status === 'ready' ? JSON.stringify(state.values) : undefined
    if (seen !== undefined && now !== undefined && now !== seen) fetch(true)
    seen = now ?? seen
  })
  void config().then(c => (seen ??= JSON.stringify(c)))
  const timer = setInterval(() => fetch(false), TICK_MS)
  fetch(false)

  return () => {
    clearInterval(timer)
    stopSettings()
  }
}

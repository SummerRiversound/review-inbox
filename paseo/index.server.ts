import type { PaseoApi } from '@getpaseo/client'
import type { PluginServerContext } from '@getpaseo/plugin/server'
import { paseoReviewer } from './server/agent'
import { gh, ghEnv } from './server/gh'
import { claudeAsk } from './server/ask'
import { announce, type Notice } from './server/notify'
import { LANGUAGE, loadAuto, loadHidden, loadInbox, loadSeen, runsDir, saveAuto, saveHidden, saveInbox, saveSeen } from './server/store'
import { autoSettings, createAutoReview } from './server/review'
import { summarizer } from './server/summarize'
import { createSync } from './server/sync'
import { PASEO_ENV } from './shared/host'
import { autoStates } from './shared/autoreview'
import { MESSAGES } from './shared/i18n'
import { REFRESH_MS } from './shared/inbox'
import { hideRpc, inboxRpc, refreshRpc } from './shared/rpc'
import { DEFAULT_CONFIG, type InboxConfig, inboxSettings } from './shared/settings'
import { toView } from './shared/view'

// How often the plugin asks whether a fetch is due: the refresh interval and a failed fetch's retry decide.
const TICK_MS = 60_000

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(inboxSettings)
  const config = async (): Promise<InboxConfig> => {
    const read = await settings.read()
    return read.status === 'ready' ? read.values : DEFAULT_CONFIG
  }
  const { sync, isFetching } = createSync({ gh, env: user => ghEnv(gh, user), summarizer: env => summarizer(claudeAsk, gh, env, LANGUAGE), config, load: loadInbox, save: saveInbox, now: Date.now, refreshMs: REFRESH_MS })
  // Paseo 0.18 sends device notifications; on an older host the app shows a toast instead.
  const notifications = (server as { notifications?: { send(notice: Notice): Promise<unknown> } }).notifications
  const m = MESSAGES[LANGUAGE]
  const fetch = (force: boolean) =>
    void sync(force)
      .then(async () => {
        if (notifications === undefined) return
        const c = await config()
        await announce(c, await loadInbox(c), { load: loadSeen, save: saveSeen }, n => notifications.send(n), (repo, n) => `${m.toast.newRequest} · ${repo} #${n}`)
      })
      .catch(error => console.error('[review-inbox] fetch failed:', error))

  // The daemon's API reaches the plugin only inside a handler or hook; the first one keeps it for the reviewer.
  // shortcut: auto review waits for the first RPC or hook after the plugin starts; Paseo in use always sends one.
  let api: PaseoApi | undefined
  const keep = (paseo: PaseoApi) => void (api ??= paseo)
  const review = createAutoReview({ gh, env: user => ghEnv(gh, user), config, loadInbox, loadAuto, saveAuto, runsDir: runsDir(), reviewer: paseoReviewer(() => api), now: Date.now, language: LANGUAGE })
  const tick = () => {
    fetch(false)
    void review().catch(error => console.error('[review-inbox] auto review failed:', error))
  }

  // Claude sessions Paseo opens carry the mark, so the review-inbox mod in them stops fetching.
  server.addHook('agent.open.before', async ({ request }, { paseo }) => {
    keep(paseo)
    return request.provider === 'claude' ? { ...request, env: { ...request.env, [PASEO_ENV]: '1' } } : request
  })
  server.addHook('agent.turn.after', async (_, { paseo }) => keep(paseo))

  server.handle(inboxRpc, async (_, { paseo }) => {
    keep(paseo)
    const c = await config()
    const file = await loadInbox(c)
    const auto = autoStates((await loadAuto(c)) ?? { jobs: {} }, file?.items ?? [], autoSettings(c), Date.now())
    return toView(file, isFetching(), { auto, hidden: await loadHidden(c), notifies: notifications !== undefined })
  })
  // Hides one card, or with no key shows every hidden card again.
  server.handle(hideRpc, async ({ key, value }) => {
    const c = await config()
    await saveHidden(c, key === undefined ? {} : { ...(await loadHidden(c)), [key]: value ?? '' })
    return {}
  })
  server.handle(refreshRpc, async (_, { paseo }) => (keep(paseo), fetch(true), {}))

  // A changed account or scope reads its own file, fetched now; a notice with the same values changes nothing.
  const lists = (c: InboxConfig) => JSON.stringify([c.githubUser, c.scope])
  let seen: string | undefined
  const stopSettings = settings.subscribe(state => {
    const now = state.status === 'ready' ? lists(state.values) : undefined
    if (seen !== undefined && now !== undefined && now !== seen) fetch(true)
    seen = now ?? seen
  })
  void config().then(c => (seen ??= lists(c)))
  const timer = setInterval(tick, TICK_MS)
  tick()

  return () => {
    clearInterval(timer)
    stopSettings()
  }
}

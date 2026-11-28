import type { PluginHandlerContext } from '@getpaseo/plugin/server'

// Paseo's API as handlers receive it; @getpaseo/client is not installed beside a plugin from Git.
type PaseoApi = PluginHandlerContext['paseo']
import type { Reviewer } from './review'

// A review given up on after this long; its agent is archived, which stops it.
const RUN_MS = 30 * 60_000
const DENIED = 'Nobody can answer a permission request during an auto review. Do without it and finish the review.'

// The reviewer as a Paseo background agent in the run folder: no tab, no notification, and the person's own
// setup and permissions. A permission request has nobody to answer it, so it is refused and the review goes on.
export const paseoReviewer =
  (paseo: () => PaseoApi | undefined): Reviewer =>
  async run => {
    const api = paseo()
    if (api === undefined) return { error: 'Paseo is not connected yet' }
    const agent = await api.agents.create({
      config: { provider: run.provider, systemPrompt: run.system },
      cwd: run.folder,
      title: run.title,
      prompt: run.prompt,
      background: true,
    })
    try {
      const deadline = Date.now() + RUN_MS
      for (;;) {
        const left = deadline - Date.now()
        if (left <= 0) return { error: 'the review took longer than 30 minutes' }
        const done = await agent.waitForFinish(left)
        if (done.status === 'idle') return done.lastMessage ? { answer: done.lastMessage } : { error: 'the reviewer gave no answer' }
        if (done.status !== 'permission') return { error: done.error ?? `the reviewer stopped (${done.status})` }
        for (const request of agent.pendingPermissions ?? []) await agent.respondToPermission({ requestId: request.id, response: { behavior: 'deny', message: DENIED } })
      }
    } finally {
      await agent.archive().catch(() => undefined)
    }
  }

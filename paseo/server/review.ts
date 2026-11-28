/// <reference types="node" />
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  autoStates,
  type AutoSettings,
  CONTEXT_FILES,
  contentKey,
  contextArgs,
  createArgs,
  createInput,
  diffArgs,
  filesArgs,
  type GhReview,
  jsonLines,
  MAX_ATTEMPTS,
  myReview,
  nextJob,
  parseReview,
  placeFindings,
  type PrFile,
  reviewBody,
  reviewerPrompt,
  reviewerRules,
  reviewsArgs,
  runName,
  sinceArgs,
  startedToday,
  trackHeads,
} from '../shared/autoreview'
import type { Gh } from '../shared/fetch'
import { type Language, MESSAGES } from '../shared/i18n'
import { itemKey } from '../shared/inbox'
import type { InboxConfig } from '../shared/settings'
import type { AutoJob, AutoReviewFile, InboxFile, InboxItem } from '../shared/types'

// One review run handed to an agent: its answer, the last message of its turn, or why there is none.
export type Reviewer = (run: { folder: string; system: string; prompt: string; title: string; provider: string }) => Promise<{ answer: string } | { error: string }>

export type ReviewDeps = {
  gh: Gh
  env: (githubUser: string) => Promise<Record<string, string>>
  config: () => Promise<InboxConfig>
  loadInbox: (config: InboxConfig) => Promise<InboxFile | undefined>
  loadAuto: (config: InboxConfig) => Promise<AutoReviewFile | undefined>
  saveAuto: (config: InboxConfig, file: AutoReviewFile) => Promise<void>
  runsDir: string
  reviewer: Reviewer
  now: () => number
  language: Language
}

// The mod's auto-review settings from this plugin's: large PRs and earlier requests are reviewed too, as the mod's defaults do.
export const autoSettings = (config: InboxConfig): AutoSettings => ({ isOn: config.autoReview, daily: config.daily ?? undefined, large: true, backlog: true, settleMs: config.settleMinutes * 60_000 })

// What a finished, failed or skipped run leaves on its job; the run's own fields are cleared.
type Outcome = Pick<AutoJob, 'status' | 'attempts' | 'error' | 'reviewId' | 'result' | 'staleFrom'>
const IDLE: Partial<AutoJob> = { status: undefined, startedAt: undefined, error: undefined, staleFrom: undefined }

// The mod's auto review, run by the Paseo daemon: one review at a time, under the daily limit, by an agent
// that has every tool of the person's setup. The plugin, not the agent, makes the pending review.
// shortcut: no 👀 lock, second reviewer, auto post, carried review or local checkout yet; the mod still has them.
export function createAutoReview(deps: ReviewDeps) {
  let isRunning = false
  const m = MESSAGES[deps.language]

  // Read, changed and written whole; `change` answering undefined writes nothing.
  const edit = async (config: InboxConfig, change: (file: AutoReviewFile) => AutoReviewFile | undefined) => {
    const next = change((await deps.loadAuto(config)) ?? { jobs: {} })
    if (next) await deps.saveAuto(config, next)
    return next
  }
  // Only while the job is still that head's: a new head replaces the job, and a run of the old one must not write into it.
  const setJob = (config: InboxConfig, key: string, head: string, fields: Partial<AutoJob>) =>
    edit(config, file => {
      const job = file.jobs[key]
      return job?.headSha === head ? { ...file, jobs: { ...file.jobs, [key]: { ...job, ...fields } } } : undefined
    })

  const run = async (config: InboxConfig, item: InboxItem): Promise<Outcome> => {
    const key = itemKey(item)
    const head = item.headSha
    const env = await deps.env(config.githubUser)
    const login = (await deps.gh(['api', 'user', '--jq', '.login'], env)).trim()
    const mine = async () => myReview(jsonLines<GhReview>(await deps.gh(reviewsArgs(item), env)), login, head)
    // GitHub is asked first: another machine, or the mod, may have reviewed this head already. No model call either way.
    const before = await mine()
    if (before?.kind === 'pending' && before.commit !== head) return { status: 'stale', reviewId: before.id, staleFrom: before.commit }
    if (before) return { status: 'done', ...(before.kind === 'pending' ? { reviewId: before.id } : {}) }

    const files = jsonLines<PrFile>(await deps.gh(filesArgs(item), env))
    const folder = join(deps.runsDir, runName(key, head))
    await mkdir(folder, { recursive: true })
    try {
      await writeFile(join(folder, 'pr.diff'), await deps.gh(diffArgs(item), env))
      if (item.reviewedSha && item.reviewedSha !== head) await writeFile(join(folder, 'since.diff'), await deps.gh(sinceArgs(item, item.reviewedSha, head), env))
      // What GitHub will not give is left out; the review goes ahead on the rest.
      const asks = contextArgs(item, head)
      const context = (
        await Promise.all(CONTEXT_FILES.map(({ name }) => deps.gh(asks[name], env).then(async text => (await writeFile(join(folder, name), text), [name]), () => [])))
      ).flat()
      const names = m.auto.severities
      const facts = { folder, hasCheckout: false, context, language: m.model.language, severities: names }
      const skills = config.skills.trim() ? `Before you review, load and follow these skills: ${config.skills.trim()}.` : ''
      // Counted as the reviewer starts, as the mod counts a spawned reviewer: a run GitHub stopped before this costs nothing.
      await edit(config, file => ({ ...file, day: new Date(deps.now()).toDateString(), started: startedToday(file, deps.now()) + 1 }))
      const out = await deps.reviewer({
        folder,
        system: reviewerRules('all'),
        prompt: [reviewerPrompt(item, facts), skills].filter(Boolean).join('\n'),
        title: `Auto review ${item.repo} #${item.number}`,
        provider: config.reviewer,
      })
      if ('error' in out) throw new Error(out.error)
      const result = parseReview(out.answer)
      if (!result) throw new Error(m.auto.unreadable)

      // A pending review of mine that appeared while the reviewer read is adopted: GitHub allows one a PR.
      const now = await mine()
      if (now) return { status: 'done', result, ...(now.kind === 'pending' ? { reviewId: now.id } : {}) }
      const { comments, rest } = placeFindings(files, result.findings, names)
      const body = reviewBody(result.summary, result.findings, rest, head, contentKey(files), names)
      const id = Number((await deps.gh(createArgs(item), env, createInput(head, body, comments))).trim())
      return { status: 'done', result, reviewId: id }
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  }

  const step = async () => {
    const config = await deps.config()
    if (!config.autoReview) return
    const inbox = await deps.loadInbox(config)
    // Only a list that was read whole: a failed fetch's lists may miss a PR and drop its job.
    if (inbox?.fetchedAt === undefined || inbox.error !== undefined) return
    const now = deps.now()
    const file = trackHeads((await deps.loadAuto(config)) ?? { jobs: {} }, inbox.items, now)
    file.enabledAt ??= now
    // A run the daemon left when it stopped goes back to the front of the queue, not counted as an attempt.
    for (const [key, job] of Object.entries(file.jobs)) if (job.status === 'running') file.jobs[key] = { ...job, ...IDLE, manual: true }
    const key = nextJob(autoStates(file, inbox.items, autoSettings(config), now))
    const item = inbox.items.find(i => itemKey(i) === key)
    if (key === undefined || item === undefined) return deps.saveAuto(config, file)
    const job = file.jobs[key]!
    await deps.saveAuto(config, { ...file, jobs: { ...file.jobs, [key]: { ...job, status: 'running', startedAt: now } } })

    const outcome = await run(config, item).catch((error: unknown): Outcome => {
      const attempts = (job.attempts ?? 0) + 1
      const message = error instanceof Error ? error.message : String(error)
      // Once more while attempts remain, else the job says why.
      return attempts < MAX_ATTEMPTS ? { status: undefined, attempts } : { status: 'failed', attempts, error: message }
    })
    await setJob(config, key, item.headSha, { ...IDLE, ...outcome })
  }

  // Ticks that come while a review runs are skipped: one review at a time.
  return async (): Promise<void> => {
    if (isRunning) return
    isRunning = true
    try {
      await step()
    } finally {
      isRunning = false
    }
  }
}

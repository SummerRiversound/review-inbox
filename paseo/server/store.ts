/// <reference types="node" />
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pickLanguage } from '../shared/i18n'
import { cacheKey } from '../shared/inbox'
import type { InboxConfig } from '../shared/settings'
import type { AutoReviewFile, InboxFile } from '../shared/types'

// Under the home of the daemon that runs the plugin, which passes it as PASEO_HOME.
const dir = () => join(process.env.PASEO_HOME ?? join(homedir(), '.paseo'), 'plugin-data', 'review-inbox')
// Where each auto review's diff and context are written for its reviewer, and removed after.
export const runsDir = () => join(dir(), 'runs')

// The language the summaries and reviews are written in: the daemon machine's.
export const LANGUAGE = pickLanguage(undefined, undefined, Intl.DateTimeFormat().resolvedOptions().locale)
// One file per account, scope and language, as the mod keeps them, so changing one never shows another's lists.
const inboxPath = (config: InboxConfig) => join(dir(), `inbox-${cacheKey(config.githubUser, config.scope, LANGUAGE)}.json`)
const autoPath = (config: InboxConfig) => join(dir(), `autoreview-${cacheKey(config.githubUser, config.scope)}.json`)

const read = async <T>(path: string): Promise<T | undefined> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return undefined
  }
}

// Written to a temporary file and renamed over the old one, so a crash mid-write never leaves half a file.
const write = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dir(), { recursive: true })
  const tmp = `${path}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(value))
  await rename(tmp, path)
}

export const loadInbox = (config: InboxConfig) => read<InboxFile>(inboxPath(config))
export const saveInbox = (config: InboxConfig, file: InboxFile) => write(inboxPath(config), file)
export const loadAuto = (config: InboxConfig) => read<AutoReviewFile>(autoPath(config))
export const saveAuto = (config: InboxConfig, file: AutoReviewFile) => write(autoPath(config), file)

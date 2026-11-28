/// <reference types="node" />
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pickLanguage } from '../shared/i18n'
import { cacheKey } from '../shared/inbox'
import type { InboxConfig } from '../shared/settings'
import type { InboxFile } from '../shared/types'

// Under the home of the daemon that runs the plugin, which passes it as PASEO_HOME.
const dir = () => join(process.env.PASEO_HOME ?? join(homedir(), '.paseo'), 'plugin-data', 'review-inbox')
// The language the summaries are written in: the daemon machine's.
export const LANGUAGE = pickLanguage(undefined, undefined, Intl.DateTimeFormat().resolvedOptions().locale)
// One file per account, scope and language, as the mod keeps them, so changing one never shows another's lists.
const path = (config: InboxConfig) => join(dir(), `inbox-${cacheKey(config.githubUser, config.scope, LANGUAGE)}.json`)

export const loadInbox = async (config: InboxConfig): Promise<InboxFile | undefined> => {
  try {
    return JSON.parse(await readFile(path(config), 'utf8')) as InboxFile
  } catch {
    return undefined
  }
}

// Written to a temporary file and renamed over the old one, so a crash mid-write never leaves half a file.
export const saveInbox = async (config: InboxConfig, file: InboxFile): Promise<void> => {
  await mkdir(dir(), { recursive: true })
  const tmp = `${path(config)}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(file))
  await rename(tmp, path(config))
}

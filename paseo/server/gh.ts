/// <reference types="node" />
import { execCommand } from '@getpaseo/plugin/server'
import type { Gh } from '../shared/fetch'

// The mod's limits: two minutes a call, and a search page cut by jq stays far under this.
const TIMEOUT_MS = 120_000
const MAX_OUTPUT = 64 * 1024 * 1024

// `gh` on the daemon's PATH; a failure throws gh's first stderr line, as the mod's does.
export const gh: Gh = async (args, env) => {
  try {
    const { stdout } = await execCommand('gh', args, { env: { ...process.env, ...env }, timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT })
    return stdout
  } catch (error) {
    const stderr = (error as { stderr?: unknown }).stderr
    const line = typeof stderr === 'string' ? stderr.trim().split('\n')[0] : ''
    throw new Error(line || (error instanceof Error ? error.message : `gh ${args[0]} failed`))
  }
}

// The account named in the settings, read through gh's own login; none named means gh's active one.
export const ghEnv = async (run: Gh, githubUser: string): Promise<Record<string, string>> =>
  githubUser ? { GH_TOKEN: (await run(['auth', 'token', '-u', githubUser], {})).trim() } : {}

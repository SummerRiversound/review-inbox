/// <reference types="node" />
import { spawnProcess, terminateProcess } from '@getpaseo/plugin/server'
import type { Gh } from '../shared/fetch'

// The mod's limits: two minutes a call, and a search page cut by jq stays far under this.
const TIMEOUT_MS = 120_000
const MAX_OUTPUT = 64 * 1024 * 1024

// `gh` on the daemon's PATH; a failure throws gh's first stderr line, as the mod's does.
export const gh: Gh = (args, env, stdin) =>
  new Promise((resolve, reject) => {
    const child = spawnProcess('gh', args, { stdio: 'pipe', env: { ...process.env, ...env } })
    let out = ''
    let err = ''
    const fail = (message: string) => {
      clearTimeout(timer)
      void terminateProcess(child)
      reject(new Error(message))
    }
    const timer = setTimeout(() => fail(`gh ${args[0]} timed out`), TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString()
      if (out.length > MAX_OUTPUT) fail(`gh ${args[0]} output too large`)
    })
    child.stderr.on('data', (chunk: Buffer) => (err += chunk.toString()))
    child.on('error', error => fail(error.message))
    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0) resolve(out)
      else reject(new Error(err.trim().split('\n')[0] || `gh ${args[0]} failed`))
    })
    child.stdin.end(stdin ?? '')
  })

// The account named in the settings, read through gh's own login; none named means gh's active one.
export const ghEnv = async (run: Gh, githubUser: string): Promise<Record<string, string>> =>
  githubUser ? { GH_TOKEN: (await run(['auth', 'token', '-u', githubUser], {})).trim() } : {}

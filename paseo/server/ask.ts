/// <reference types="node" />
import { spawnProcess, terminateProcess } from '@getpaseo/plugin/server'

// The mod summarizes on sonnet; low effort is enough for a few sentences from a title, files and description.
const SUMMARY_MODEL = 'claude-sonnet-5-5'
// A call given up on after this long is killed, so it never answers late.
const TIMEOUT_MS = 90_000
// The printed JSON is the answer and a few counters; more than this is not a summary.
const MAX_OUTPUT = 1024 * 1024

// A one-shot answer to `prompt` under `system`, or null when the call failed.
export type Ask = (system: string, prompt: string) => Promise<string | null>

// A one-shot Claude Code print with none of the person's setup (CLAUDE.md, settings, skills, plugins and
// hooks, MCP servers), no tools and no saved session, as plan-flow's planner runs: the model reads the
// prompt and answers. The prompt itself goes on stdin.
export const printArgs = (system: string, model = SUMMARY_MODEL): string[] => [
  '--print',
  '--safe-mode',
  // Safe mode still applies the settings' `language`, which would override the summary's.
  '--setting-sources', '',
  '--strict-mcp-config',
  '--no-session-persistence',
  '--tools', '',
  '--model', model,
  '--effort', 'low',
  '--output-format', 'json',
  '--system-prompt', system,
]

// The answer in a print's JSON, or null when the call failed or printed something else.
export const answerOf = (stdout: string): string | null => {
  try {
    const r = JSON.parse(stdout) as { is_error?: unknown; result?: unknown }
    return r.is_error === false && typeof r.result === 'string' ? r.result : null
  } catch {
    return null
  }
}

// shortcut: through the `claude` on the daemon's PATH; a daemon without Claude Code keeps titles as summaries.
export const claudeAsk: Ask = (system, prompt) =>
  new Promise(resolve => {
    const child = spawnProcess('claude', printArgs(system), { stdio: 'pipe' })
    let out = ''
    const stop = (answer: string | null) => {
      clearTimeout(timer)
      resolve(answer)
    }
    const timer = setTimeout(() => {
      void terminateProcess(child)
      stop(null)
    }, TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString()
      if (out.length > MAX_OUTPUT) {
        void terminateProcess(child)
        stop(null)
      }
    })
    child.on('error', err => {
      console.error('[review-inbox] model call failed:', err.message)
      stop(null)
    })
    child.on('close', () => stop(answerOf(out)))
    child.stdin.end(prompt)
  })

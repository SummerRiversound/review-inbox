import type { Presence } from '../types'

// A session checks in every 30 seconds; one silent this long was closed or killed without a word.
export const SESSION_STALE_MS = 10 * 60_000

// shortcut: github.com remotes only, so under GH_HOST a session is found by its links alone; match that host too if Enterprise users ask
export function repoOf(remote: string): string | undefined {
  return /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(remote)?.[1]
}

export function liveSessions(sessions: Record<string, Presence>, now: number): Record<string, Presence> {
  return Object.fromEntries(Object.entries(sessions).filter(([, s]) => now - s.at < SESSION_STALE_MS))
}

// The sessions working on a PR: checked out on its branch in its repository, or asked about it by link.
export function workingOn(sessions: Record<string, Presence>, pr: { repo: string; url: string; branch?: string }): string[] {
  return Object.entries(sessions)
    .filter(([, s]) => s.prs.includes(pr.url) || (pr.branch !== undefined && s.branch === pr.branch && s.remotes.includes(pr.repo)))
    .map(([id]) => id)
}

import type { Presence, RepoPaths } from '../types'

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

// Where Claude works on a repository: this session's folder, a folder remembered for it, or nowhere known yet.
export type Place = { kind: 'here' } | { kind: 'folder'; path: string } | { kind: 'unknown' }

const slashes = (path: string) => path.replace(/\\/g, '/').replace(/\/$/, '')

// The common dir names the main checkout's .git from inside any of its worktrees; a bare repository or my home folder maps nothing.
export function mainCheckout(commonDir: string, home: string): string | undefined {
  const dir = commonDir.trim()
  if (!dir.endsWith('/.git')) return undefined
  const top = dir.slice(0, -'/.git'.length)
  return slashes(top) === slashes(home) ? undefined : top
}

export function remember(repos: RepoPaths, remotes: string[], path: string, now: number): RepoPaths {
  return { ...repos, ...Object.fromEntries(remotes.map(repo => [repo, { path, at: now }])) }
}

export function placeOf(repo: string, self: Presence | undefined, repos: RepoPaths): Place {
  if (self?.remotes.includes(repo)) return { kind: 'here' }
  const known = repos[repo]
  return known ? { kind: 'folder', path: known.path } : { kind: 'unknown' }
}

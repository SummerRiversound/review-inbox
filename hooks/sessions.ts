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

// A folder the repoPaths option names comes first, as the person set it on purpose.
export function placeOf(repo: string, self: Presence | undefined, repos: RepoPaths, mapped?: string): Place {
  if (mapped) return { kind: 'folder', path: mapped }
  if (self?.remotes.includes(repo)) return { kind: 'here' }
  const known = repos[repo]
  return known ? { kind: 'folder', path: known.path } : { kind: 'unknown' }
}

// The repoPaths option: `owner/repo=path` or `owner/*=path/*`, comma-separated, as gh-dash's repoPaths.
export function parseRepoPaths(text: string): Record<string, string> {
  return Object.fromEntries(
    text.split(',').flatMap(entry => {
      const at = entry.indexOf('=')
      const [repo, path] = [entry.slice(0, at).trim(), entry.slice(at + 1).trim()]
      return at > 0 && path && /^[^/\s]+\/[^/\s]+$/.test(repo) ? [[repo.toLowerCase(), path]] : []
    }),
  )
}

// An exact name wins over its owner's wildcard; `*` in the path is the repository's name and a leading ~ is home.
export function mappedPath(repo: string, paths: Record<string, string>, home: string): string | undefined {
  const [owner = '', name = ''] = repo.toLowerCase().split('/')
  const path = paths[repo.toLowerCase()] ?? paths[`${owner}/*`]?.replaceAll('*', repo.split('/')[1] ?? name)
  return path?.replace(/^~(?=$|[\\/])/, home)
}

// What gh itself treats as the current repository: GH_REPO ([HOST/]OWNER/REPO) when set, else the folder's remotes.
export function thisRepos(self: Presence | undefined, ghRepo: string | undefined): string[] {
  const parts = (ghRepo ?? '').trim().split('/').filter(Boolean)
  return parts.length >= 2 ? [parts.slice(-2).join('/')] : (self?.remotes ?? [])
}

export const isHere = (repo: string, here: string[]) => here.some(r => r.toLowerCase() === repo.toLowerCase())

export const hereFirst = <T extends { repo: string }>(cards: T[], here: string[]) => [
  ...cards.filter(c => isHere(c.repo, here)),
  ...cards.filter(c => !isHere(c.repo, here)),
]

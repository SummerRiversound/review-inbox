import type { GroupHit, GroupResult, SearchGroup } from '../types'
import { mergeById } from './actions'
import type { Messages } from './i18n'
import { PAGE, PAGE_ARGS } from './pages'

// Past this many the tab stops being a glance, and each group is one more search per refresh.
export const MAX_GROUPS = 15
// The newest of each group; the rest are a link to the same search on GitHub.
export const GROUP_HITS = 20

// GitHub Inbox's smart filters, as groups.
export const BUILT_IN_GROUPS: { id: keyof Messages['searches']['builtIn']; scope: SearchGroup['scope']; query: string }[] = [
  { id: 'involves-me', scope: 'prs', query: 'is:open involves:@me -author:@me' },
  { id: 'reviewed-by-me', scope: 'prs', query: 'is:open reviewed-by:@me -author:@me -review-requested:@me' },
  { id: 'my-open-issues', scope: 'issues', query: 'is:open author:@me' },
]

// What the Searches tab shows and the fetch runs, in file order after the built-ins; `extra` is how many were left out.
export function searchGroups(m: Messages, mine: SearchGroup[]): { groups: SearchGroup[]; extra: number } {
  const all = mergeById<SearchGroup>(BUILT_IN_GROUPS.map(g => ({ ...g, name: m.searches.builtIn[g.id] })), mine)
  return { groups: all.slice(0, MAX_GROUPS), extra: Math.max(0, all.length - MAX_GROUPS) }
}

// The group's own query, plus its scope's kind and newest first unless it says otherwise. The scope setting does not apply.
export function groupQuery(group: SearchGroup): string {
  const q = group.query.trim()
  const kind = /(^|[\s(])-?(is|type):(pr|issue)\b/i.test(q) ? [] : [group.scope === 'prs' ? 'is:pr' : 'is:issue']
  const sort = /(^|[\s(])sort:/i.test(q) ? [] : ['sort:updated-desc']
  return [q, ...kind, ...sort].join(' ')
}

export const searchUrl = (group: SearchGroup) =>
  `https://github.com/search?q=${encodeURIComponent(groupQuery(group))}&type=${group.scope === 'prs' ? 'pullrequests' : 'issues'}`

// A result answers the group only while its query is the group's current one.
export const resultOf = (group: SearchGroup, results: Record<string, GroupResult>) =>
  results[group.id]?.query === groupQuery(group) ? results[group.id] : undefined

export const bandSearchCount = (groups: SearchGroup[], results: Record<string, GroupResult>) =>
  groups.filter(g => g.countInBand).reduce((sum, g) => sum + (resultOf(g, results)?.count ?? 0), 0)

const HIT = 'number title url updatedAt author { login } repository { nameWithOwner }'
export const GROUP_QUERY = `query($q: String!, ${PAGE_ARGS}) {
  search(query: $q, type: ISSUE, ${PAGE}) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes { ... on PullRequest { ${HIT} } ... on Issue { ${HIT} } }
  }
}`

export type GqlHit = {
  number: number
  title: string
  url: string
  updatedAt: string
  author: { login: string } | null
  repository: { nameWithOwner: string }
}

export function toHits(nodes: Partial<GqlHit>[]): GroupHit[] {
  return nodes
    .filter((n): n is GqlHit => typeof n.number === 'number')
    .map(n => ({ repo: n.repository.nameWithOwner, number: n.number, title: n.title, url: n.url, author: n.author?.login ?? 'ghost', updatedAt: n.updatedAt }))
}

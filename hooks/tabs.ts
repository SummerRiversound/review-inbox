import type { IssueItem, MyPr, MyPrState } from '../types'
import type { Messages } from './i18n'

type Repo = { repository: { nameWithOwner: string } }
type Item = Repo & { number: number; title: string; url: string }

export type GqlMyPr = Item & {
  isDraft: boolean
  createdAt: string
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  commits: { nodes: { commit: { committedDate: string; statusCheckRollup: { state: string } | null } }[] }
  reviews: { nodes: { state: string; submittedAt: string | null; author: { login: string } | null }[] }
}

export type GqlTouched = Item & { updatedAt: string }

export type GqlReferenced = Repo & {
  number: number
  timelineItems: {
    nodes: { createdAt: string; actor: { login: string } | null; source: Partial<Item> }[]
  }
}

// Assigned and mentioned issues plus my open PRs: one request, three aliased searches.
export const TABS_QUERY = `query($mine: String!, $assigned: String!, $mentioned: String!) {
  viewer { login }
  mine: search(query: $mine, type: ISSUE, first: 100) { nodes { ... on PullRequest {
    number title url isDraft createdAt repository { nameWithOwner } reviewDecision mergeable
    commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } }
    reviews(last: 30) { nodes { state submittedAt author { login } } } } } }
  assigned: search(query: $assigned, type: ISSUE, first: 50) { nodes {
    ... on Issue { number title url updatedAt repository { nameWithOwner } } } }
  mentioned: search(query: $mentioned, type: ISSUE, first: 50) { nodes {
    ... on Issue { number title url updatedAt repository { nameWithOwner } }
    ... on PullRequest { number title url updatedAt repository { nameWithOwner } } } }
}`

// My PRs and issues touched lately, with who pointed at them from elsewhere; paged.
// 50 per page: at 100, items with long timelines exceed GitHub's per-query resource limit.
export const REFERENCES_QUERY = `query($q: String!, $since: DateTime!, $after: String) {
  search(query: $q, type: ISSUE, first: 50, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest { number repository { nameWithOwner }
        timelineItems(itemTypes: [CROSS_REFERENCED_EVENT], since: $since, last: 20) { nodes { ...ref } } }
      ... on Issue { number repository { nameWithOwner }
        timelineItems(itemTypes: [CROSS_REFERENCED_EVENT], since: $since, last: 20) { nodes { ...ref } } }
    }
  }
}
fragment ref on CrossReferencedEvent {
  createdAt actor { login }
  source { ... on PullRequest { number title url repository { nameWithOwner } }
           ... on Issue { number title url repository { nameWithOwner } } }
}`

export const REFERENCE_DAYS = 30
// A reference does not bump the referenced item's updatedAt, so items are picked from a wider window than the events.
// ponytail: measured on one account, every missed reference was on an item touched 30-60 days before; older ones are still missed
export const AUTHORED_DAYS = 60
// ponytail: newest references only; a busy month had 50+, more than a drawer can show usefully
const MAX_REFERENCES = 20

// Newest activity first, so the page caps drop the stalest items rather than arbitrary ones.
export function tabQueries(scope: string) {
  const q = (base: string) => [base, 'sort:updated-desc', scope.trim()].filter(Boolean).join(' ')
  return {
    mine: q('is:pr is:open author:@me'),
    assigned: q('is:issue is:open assignee:@me'),
    mentioned: q('is:open mentions:@me'),
  }
}

export function referencesQuery(scope: string, touchedSince: string): string {
  return [`author:@me updated:>=${touchedSince.slice(0, 10)} sort:updated-desc`, scope.trim()].filter(Boolean).join(' ')
}

// Ordered by what I have to do next.
const ORDER: MyPrState[] = ['changes', 'ci-failing', 'conflict', 'waiting', 'approved', 'draft']

export function myPrState(pr: GqlMyPr): MyPrState {
  const ci = pr.commits.nodes[0]?.commit.statusCheckRollup?.state
  if (pr.isDraft) return 'draft'
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'changes'
  if (ci === 'FAILURE' || ci === 'ERROR') return 'ci-failing'
  // UNKNOWN is GitHub not having computed it yet, not a conflict.
  if (pr.mergeable === 'CONFLICTING') return 'conflict'
  if (pr.reviewDecision === 'APPROVED') return 'approved'
  return 'waiting'
}

// A review submitted after my latest commit is one I have not answered with a commit yet.
// Compared by time, not by the review's commit: a thread reply stays pinned to the commit its thread started on.
export function newReviews(pr: GqlMyPr, me: string): MyPr['newReviews'] {
  const head = Date.parse(pr.commits.nodes[0]?.commit.committedDate ?? '') || 0
  return pr.reviews.nodes
    .filter(r => r.state !== 'PENDING' && r.state !== 'DISMISSED' && r.author && r.author.login.toLowerCase() !== me.toLowerCase())
    .filter(r => r.submittedAt && Date.parse(r.submittedAt) > head)
    .map(r => ({ by: r.author!.login, at: r.submittedAt! }))
}

export function toMyPrs(prs: GqlMyPr[], me: string): MyPr[] {
  return prs
    .map(pr => ({
      repo: pr.repository.nameWithOwner,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      createdAt: pr.createdAt,
      state: myPrState(pr),
      ciPending: ['PENDING', 'EXPECTED'].includes(pr.commits.nodes[0]?.commit.statusCheckRollup?.state ?? ''),
      newReviews: newReviews(pr, me),
    }))
    .sort(
      (a, b) =>
        ORDER.indexOf(a.state) - ORDER.indexOf(b.state) ||
        Number(b.newReviews.length > 0) - Number(a.newReviews.length > 0) ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt),
    )
}

// References by others to my items, newest first.
export function toReferences(referenced: GqlReferenced[], me: string): IssueItem[] {
  return referenced
    .flatMap(target =>
      target.timelineItems.nodes
        // Links I made between my own PRs are not news.
        .filter(e => e.actor && e.actor.login.toLowerCase() !== me.toLowerCase() && e.source.url)
        .map(e => ({
          kind: 'reference' as const,
          repo: e.source.repository!.nameWithOwner,
          number: e.source.number!,
          title: e.source.title!,
          url: e.source.url!,
          at: e.createdAt,
          by: e.actor!.login,
          target: `${target.repository.nameWithOwner}#${target.number}`,
        })),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export function toIssues(assigned: GqlTouched[], mentioned: GqlTouched[], references: IssueItem[]): IssueItem[] {
  const seen = new Set<string>()
  const out: IssueItem[] = []
  const add = (kind: IssueItem['kind'], i: GqlTouched) => {
    // Assigned wins over a mention of the same thread.
    if (seen.has(i.url)) return
    seen.add(i.url)
    out.push({ kind, repo: i.repository.nameWithOwner, number: i.number, title: i.title, url: i.url, at: i.updatedAt })
  }
  assigned.forEach(i => add('assigned', i))
  mentioned.forEach(i => add('mention', i))

  const keys = new Set<string>()
  const rest = references
    // A thread already listed for me directly, or the same link seen twice, shows once.
    .filter(r => !seen.has(r.url) && !keys.has(issueKey(r)) && keys.add(issueKey(r)))
    .slice(0, MAX_REFERENCES)

  return [...out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), ...rest]
}

export function stateColor(state: MyPrState): 'error' | 'warning' | 'success' | 'subtle' | 'inactive' {
  return state === 'changes' || state === 'ci-failing'
    ? 'error'
    : state === 'conflict'
      ? 'warning'
      : state === 'approved'
        ? 'success'
        : state === 'draft'
          ? 'inactive'
          : 'subtle'
}

const stuck = (pr: MyPr) => pr.state === 'changes' || pr.state === 'ci-failing' || pr.state === 'conflict'
export const needsMe = (pr: MyPr) => stuck(pr) || pr.newReviews.length > 0

export const reviewers = (pr: MyPr) => [...new Set(pr.newReviews.map(r => r.by))].join(', ')

// One alert per PR: it turned to a state that needs me, new reviews arrived, or both.
export type PrAlert = { pr: MyPr; turned: boolean; by?: string }

const stateKey = (pr: MyPr) => `${pr.url}@${pr.state}`
const reviewKey = (pr: MyPr, r: MyPr['newReviews'][number]) => `${pr.url}@review:${r.by}@${r.at}`

export function prAlerts(seen: string[] | undefined, prs: MyPr[]): PrAlert[] {
  if (seen === undefined) return []
  const known = new Set(seen)
  return prs.flatMap(pr => {
    const turned = stuck(pr) && !known.has(stateKey(pr))
    const fresh = pr.newReviews.filter(r => !known.has(reviewKey(pr, r)))
    if (!turned && fresh.length === 0) return []
    return [{ pr, turned, ...(fresh.length > 0 ? { by: [...new Set(fresh.map(r => r.by))].join(', ') } : {}) }]
  })
}

export function prAlertText({ pr, turned, by }: PrAlert, m: Messages): string {
  return [turned ? m.alert.turned(m.state[pr.state]) : m.alert.reviewed, turned && by ? m.alert.by(by) : by, `${pr.repo} #${pr.number}`]
    .filter(Boolean)
    .join(' · ')
}

export const prSeenKeys = (prs: MyPr[]) => prs.flatMap(pr => [stateKey(pr), ...pr.newReviews.map(r => reviewKey(pr, r))])

export const issueKey = (i: IssueItem) => `${i.kind}:${i.url}:${i.target ?? ''}`

export function issueAlerts(seen: string[] | undefined, issues: IssueItem[]): IssueItem[] {
  if (seen === undefined) return []
  const known = new Set(seen)
  return issues.filter(i => !known.has(issueKey(i)))
}

// The band counts only what needs action.
export type BandCounts = { reviews: number; prTodo: number; issues: number }

export function bandCounts(reviews: number, prs: MyPr[], issues: IssueItem[]): BandCounts {
  return {
    reviews,
    prTodo: prs.filter(needsMe).length,
    issues: issues.filter(i => i.kind !== 'reference').length,
  }
}

// Zeros are left out.
export function bandLabels(counts: BandCounts, m: Messages): string[] {
  return (['reviews', 'prTodo', 'issues'] as const).filter(k => counts[k] > 0).map(k => m.band[k](counts[k]))
}

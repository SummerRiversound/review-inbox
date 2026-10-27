import type { Capped, IssueItem, MyPr, MyPrState, TaskKind } from '../types'
import type { Messages } from './i18n'
import { DETAILS_FIELDS, detailsOf, hasRequest } from './inbox'
import type { GqlDetails } from './inbox'
import { PAGE, PAGE_ARGS } from './pages'
import type { Place } from './sessions'

type Repo = { repository: { nameWithOwner: string; defaultBranchRef?: { name: string } | null } }
type Item = Repo & { number: number; title: string; url: string }
type Body = { body?: string | null }

export type GqlMyPr = Item & Body & GqlDetails & {
  headRefName?: string
  baseRefName?: string
  isDraft: boolean
  createdAt: string
  updatedAt?: string
  isInMergeQueue?: boolean
  headRefOid?: string
  mergeStateStatus?: string
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  commits: { nodes: { commit: { committedDate: string; statusCheckRollup: { state: string } | null } }[] }
  reviews: { nodes: { state: string; submittedAt: string | null; author: { login: string } | null }[] }
}

export type GqlTouched = Item & Body & GqlDetails & { updatedAt: string }

export type GqlReferenced = Repo & {
  number: number
  timelineItems: {
    nodes: { createdAt: string; actor: { login: string } | null; source: Partial<Item> }[]
  }
}

const tabSearch = (nodes: string) => `query($q: String!, ${PAGE_ARGS}) {
  viewer { login }
  search(query: $q, type: ISSUE, ${PAGE}) { pageInfo { hasNextPage endCursor } nodes { ${nodes} } }
}`

// One search per tab list, each paged on its own: together they outran GitHub's ~10 s limit on accounts with many PRs.
export const TAB_QUERIES = {
  mine: tabSearch(`... on PullRequest {
    number title url body headRefName baseRefName isDraft createdAt updatedAt isInMergeQueue headRefOid mergeStateStatus repository { nameWithOwner defaultBranchRef { name } } reviewDecision mergeable
    ${DETAILS_FIELDS}
    commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } }
    reviews(last: 30) { nodes { state submittedAt author { login } } } }`),
  assigned: tabSearch(`... on Issue { number title url body updatedAt repository { nameWithOwner } ${DETAILS_FIELDS} }`),
  mentioned: tabSearch(
    `... on Issue { number title url body updatedAt repository { nameWithOwner } ${DETAILS_FIELDS} }
    ... on PullRequest { number title url body updatedAt repository { nameWithOwner } ${DETAILS_FIELDS} }`,
  ),
}

// My PRs and issues touched lately, with who pointed at them from elsewhere.
export const REFERENCES_QUERY = `query($q: String!, $since: DateTime!, ${PAGE_ARGS}) {
  search(query: $q, type: ISSUE, ${PAGE}) {
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
// A references node is a few small timeline events, so a page of 100 stays well inside GitHub's time limit:
// measured on one account, 286 items took 3 requests and 6 s instead of 12 requests and 15 s at the default page.
export const REFERENCE_PAGE = 100
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
export const ORDER: MyPrState[] = ['changes', 'ci-failing', 'conflict', 'waiting', 'approved', 'queued', 'draft']

export function myPrState(pr: GqlMyPr): MyPrState {
  const ci = pr.commits.nodes[0]?.commit.statusCheckRollup?.state
  if (pr.isDraft) return 'draft'
  // Nothing left for me: GitHub merges it once the queue's checks pass, or drops it back to a state that is.
  if (pr.isInMergeQueue) return 'queued'
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
      ...(pr.updatedAt ? { updatedAt: pr.updatedAt } : {}),
      state: myPrState(pr),
      ...(pr.headRefOid ? { headSha: pr.headRefOid } : {}),
      ...(pr.mergeStateStatus === 'BEHIND' ? { isBehind: true } : {}),
      ciPending: ['PENDING', 'EXPECTED'].includes(pr.commits.nodes[0]?.commit.statusCheckRollup?.state ?? ''),
      newReviews: newReviews(pr, me),
      ...(pr.body ? { body: pr.body } : {}),
      ...(pr.headRefName ? { branch: pr.headRefName } : {}),
      ...(pr.baseRefName ? { base: pr.baseRefName } : {}),
      ...detailsOf(pr),
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
    out.push({ kind, repo: i.repository.nameWithOwner, number: i.number, title: i.title, url: i.url, at: i.updatedAt, ...(i.body ? { body: i.body } : {}), ...detailsOf(i) })
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
      : state === 'approved' || state === 'queued'
        ? 'success'
        : state === 'draft'
          ? 'inactive'
          : 'subtle'
}

const stuck = (pr: MyPr) => pr.state === 'changes' || pr.state === 'ci-failing' || pr.state === 'conflict'
export const needsMe = (pr: MyPr) => stuck(pr) || pr.newReviews.length > 0

export type Task = { kind: TaskKind; repo: string; url: string; base?: string }

export function taskOf(card: MyPr | IssueItem): TaskKind | undefined {
  if ('state' in card) return stuck(card) ? (card.state as TaskKind) : undefined
  return card.kind === 'assigned' ? 'work' : undefined
}

// Like the review requests: one per card the draft does not link yet, each saying where to work.
// Where a request says to work: the PR's own worktree in the folder known for its repository, or a question when none is.
export const workWhere = (place: Place, repo: string, isPr: boolean, m: Messages) =>
  place.kind === 'unknown' ? m.prompt.noClone(repo) : m.prompt.workIn(place.kind === 'here' ? m.prompt.here : place.path, isPr)

export function taskPrompts(draft: string, tasks: { task: Task; place: Place }[], m: Messages): string {
  let text = draft
  for (const { task, place } of tasks) {
    if (hasRequest(text, task.url)) continue
    const lines = `${m.prompt.task[task.kind](task.url, task.base)}\n${workWhere(place, task.repo, task.kind !== 'work', m)}\n`
    text += text === '' || text.endsWith('\n') ? lines : `\n${lines}`
  }
  return text.slice(draft.length)
}

export const reviewers = (pr: MyPr) => [...new Set(pr.newReviews.map(r => r.by))].join(', ')

// One alert per PR: it turned to a state that needs me or became ready to merge, new reviews arrived, or both.
export type PrAlert = { pr: MyPr; turned: boolean; ready?: boolean; by?: string }

const stateKey = (pr: MyPr) => `${pr.url}@${pr.state}`
// Approved with no CI running: the only success worth a toast, as CI passing alone is no news.
const isReady = (pr: MyPr) => pr.state === 'approved' && !pr.ciPending
const readyKey = (pr: MyPr) => `${pr.url}@ready`
const reviewKey = (pr: MyPr, r: MyPr['newReviews'][number]) => `${pr.url}@review:${r.by}@${r.at}`

export function prAlerts(seen: string[] | undefined, prs: MyPr[]): PrAlert[] {
  if (seen === undefined) return []
  const known = new Set(seen)
  return prs.flatMap(pr => {
    const turned = stuck(pr) && !known.has(stateKey(pr))
    const ready = isReady(pr) && !known.has(readyKey(pr))
    const fresh = pr.newReviews.filter(r => !known.has(reviewKey(pr, r)))
    if (!turned && !ready && fresh.length === 0) return []
    return [{ pr, turned, ...(ready ? { ready } : {}), ...(fresh.length > 0 ? { by: [...new Set(fresh.map(r => r.by))].join(', ') } : {}) }]
  })
}

export function prAlertText({ pr, turned, ready, by }: PrAlert, m: Messages): string {
  const head = turned ? m.alert.turned(m.state[pr.state]) : ready ? m.alert.ready : m.alert.reviewed
  return [head, (turned || ready) && by ? m.alert.by(by) : by, `${pr.repo} #${pr.number}`]
    .filter(Boolean)
    .join(' · ')
}

// One toast for what changed while no session was open: each kind of news with how many, a PR counted once as prAlertText heads it.
export function awayText(requests: number, prNews: PrAlert[], issues: IssueItem[], m: Messages): string | undefined {
  const labels = [
    ...Array<string>(requests).fill(m.toast.newRequest),
    ...prNews.map(({ pr, turned, ready }) => (turned ? m.state[pr.state] : ready ? m.alert.ready : m.alert.reviewed)),
    ...issues.map(i => m.issueKind[i.kind]),
  ]
  if (labels.length === 0) return undefined
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return [m.toast.away, ...[...counts].map(([label, n]) => `${label} ${n}`)].join(' · ')
}

export const prSeenKeys = (prs: MyPr[]) =>
  prs.flatMap(pr => [stateKey(pr), ...(isReady(pr) ? [readyKey(pr)] : []), ...pr.newReviews.map(r => reviewKey(pr, r))])

export const issueKey = (i: IssueItem) => `${i.kind}:${i.url}:${i.target ?? ''}`

// Hidden until it turns to another state or someone reviews it after the hide; my own push alone does not bring it back.
export const prHideKey = (pr: MyPr) => `pr:${pr.url}`
export const prHide = (pr: MyPr, now: number): [string, string] => [prHideKey(pr), `${pr.state}@${now}`]

export function isPrHidden(hidden: Record<string, string>, pr: MyPr): boolean {
  const [state, at] = (hidden[prHideKey(pr)] ?? '').split('@')
  return state === pr.state && pr.newReviews.every(r => Date.parse(r.at) <= Number(at))
}

// Hidden until the thread has new activity.
export const issueHideKey = (i: IssueItem) => `issue:${issueKey(i)}`
export const issueHide = (i: IssueItem): [string, string] => [issueHideKey(i), i.at]

export const isIssueHidden = (hidden: Record<string, string>, i: IssueItem) => hidden[issueHideKey(i)] === i.at

export function issueAlerts(seen: string[] | undefined, issues: IssueItem[]): IssueItem[] {
  if (seen === undefined) return []
  const known = new Set(seen)
  return issues.filter(i => !known.has(issueKey(i)))
}

// The band counts only what needs action.
export type BandCounts = { reviews: number; prTodo: number; issues: number; searches: number }
// The band's order.
export const BAND_KEYS = ['reviews', 'prTodo', 'issues', 'searches'] as const

// Each tab reads one page of search results; past it, a count is only a lower bound.
export const atLeast = (n: number, capped = false) => (capped ? `${n}+` : `${n}`)

// `searches` is what the search groups counted in the band found.
export function bandCounts(reviews: number, prs: MyPr[], issues: IssueItem[], searches = 0): BandCounts {
  return {
    reviews,
    prTodo: prs.filter(needsMe).length,
    issues: issues.filter(i => i.kind !== 'reference').length,
    searches,
  }
}

// Zeros are left out.
export function bandLabels(counts: BandCounts, m: Messages, capped: Capped = {}): string[] {
  const tabOf = { reviews: 'review', prTodo: 'mine', issues: 'issues', searches: 'searches' } as const
  return BAND_KEYS.filter(k => counts[k] > 0).map(k => m.band[k](atLeast(counts[k], capped[tabOf[k]])))
}

// A count that went down but not to zero, which leaves the band: what the band flashes for a moment.
export function droppedCounts(before: BandCounts | undefined, after: BandCounts): (keyof BandCounts)[] {
  if (before === undefined) return []
  return BAND_KEYS.filter(k => after[k] > 0 && after[k] < before[k])
}

import { BODY_CHARS } from './notes'
import { headCommittedAt, INBOX_QUERY, itemKey, lastReviewedSha, requestedAt, requestedTeam, reusableSummary, searchQuery, sortItems, toDetail } from './inbox'
import type { GqlPr, PrDetail, SearchHit, Summary } from './inbox'
import { readPages, SEARCH_LIMIT } from './pages'
import type { Page, Pages } from './pages'
import { AUTHORED_DAYS, REFERENCE_DAYS, REFERENCE_PAGE, REFERENCES_QUERY, referencesQuery, TAB_QUERIES, tabQueries, toIssues, toMyPrs, toReferences } from './tabs'
import type { GqlMyPr, GqlReferenced, GqlTouched } from './tabs'
import type { Capped, InboxFile, InboxItem, IssueItem, MyPr } from './types'

// How the inbox is read from GitHub, the same for the mod and the Paseo plugin: each passes in how it
// runs `gh` (and, for the review list, how it asks a model), so only the running differs.

// Runs `gh` with these arguments and extra environment, `stdin` on its input, and gives its output; throws when gh fails.
export type Gh = (args: string[], env: Record<string, string>, stdin?: string) => Promise<string>
// The error a fetch keeps when the daemon machine has no `gh` at all; the panel words it as setup help.
export const GH_MISSING = 'gh-missing'

// Lists fetched so far, merged into the claimed file as each one arrives.
export type Save = (lists: Partial<InboxFile>) => Promise<void>

// A pull request's summary, and the line on what changed since my last review.
export type Summarizer = {
  summary: (hit: SearchHit, detail: PrDetail, prev: InboxItem | undefined) => Promise<Summary>
  since: (repo: string, from: string, to: string) => Promise<string | undefined>
}

// One search, read a page at a time; `jq` cuts each page below gh's output cap.
export function searchAll<T>(gh: Gh, query: string, vars: Record<string, string>, env: Record<string, string>, limit: number, jq = '.data', pageSize?: number) {
  const fields = Object.entries(vars).flatMap(([name, value]) => ['-f', `${name}=${value}`])
  return readPages<T>(
    async (first, after) =>
      JSON.parse(
        await gh(['api', 'graphql', '-f', `query=${query}`, ...fields, '-F', `first=${first}`, ...(after ? ['-f', `after=${after}`] : []), '--jq', jq], env),
      ) as Page<T>,
    limit,
    pageSize,
  )
}

export const trimBodies = (chars: number) => `.data | .search.nodes |= map(if .body then .body |= .[:${chars}] else . end)`

export async function fetchTabs(
  gh: Gh,
  scope: string,
  env: Record<string, string>,
  previous: IssueItem[],
  save: Save,
): Promise<{ mine: MyPr[]; issues: IssueItem[]; capped: Capped }> {
  const q = tabQueries(scope)
  const tabSearch = <T,>(key: keyof typeof q): Promise<Pages<T>> => searchAll(gh, TAB_QUERIES[key], { q: q[key] }, env, SEARCH_LIMIT, trimBodies(BODY_CHARS))
  const [minePrs, assigned, mentioned] = await Promise.all([tabSearch<GqlMyPr>('mine'), tabSearch<GqlTouched>('assigned'), tabSearch<GqlTouched>('mentioned')])
  const me = minePrs.login ?? assigned.login ?? ''
  const real = <T,>(nodes: Partial<T & { number: number }>[]) =>
    nodes.filter((n): n is T & { number: number } => typeof n.number === 'number')
  const mine = toMyPrs(real<GqlMyPr>(minePrs.nodes), me)
  const withReferences = (references: IssueItem[]) => toIssues(real<GqlTouched>(assigned.nodes), real<GqlTouched>(mentioned.nodes), references)
  const capped = { mine: minePrs.capped, issues: assigned.capped || mentioned.capped }
  const lastReferences = previous.filter(i => i.kind === 'reference')
  // References are the slowest search, so the other lists show first, beside the last references.
  await save({ mine, issues: withReferences(lastReferences), capped })

  const since = new Date(Date.now() - REFERENCE_DAYS * 86_400_000).toISOString()
  const touchedSince = new Date(Date.now() - AUTHORED_DAYS * 86_400_000).toISOString()
  let references: IssueItem[]
  try {
    // ponytail: at most 500 items touched in the window, newest first; past that the rest are left out
    const referenced: Pages<GqlReferenced> = await searchAll(gh, REFERENCES_QUERY, { q: referencesQuery(scope, touchedSince), since }, env, 500, '.data', REFERENCE_PAGE)
    references = toReferences(real<GqlReferenced>(referenced.nodes), me)
  } catch {
    // References are the costliest search; when GitHub refuses it, keep the last ones instead of failing every tab.
    references = lastReferences
  }

  return { mine, issues: withReferences(references), capped }
}

export async function fetchInbox(
  gh: Gh,
  scope: string,
  env: Record<string, string>,
  previous: InboxItem[],
  summarizer: Summarizer,
  heartbeat: () => Promise<void>,
): Promise<{ items: InboxItem[]; capped: boolean }> {
  const found: Pages<GqlPr> = await searchAll(gh, INBOX_QUERY, { q: searchQuery(scope) }, env, SEARCH_LIMIT, trimBodies(12_000))
  const me = found.login ?? ''
  // Search can return non-PR nodes as empty objects.
  const prs = found.nodes.filter((n): n is GqlPr => typeof n.number === 'number')
  const before = new Map(previous.map(i => [itemKey(i), i]))

  const next: InboxItem[] = []
  // ponytail: fixed batches of 3 model calls; a work queue only matters past a few dozen PRs
  for (let i = 0; i < prs.length; i += 3) {
    const batch = await Promise.all(
      prs.slice(i, i + 3).map(async pr => {
        const repo = pr.repository.nameWithOwner
        const prev = before.get(`${repo}#${pr.number}`)
        const detail = toDetail(pr)
        const head = pr.headRefOid
        const summary = reusableSummary(prev, head) ?? (await summarizer.summary(pr, detail, prev))
        const reviewedSha = lastReviewedSha(detail.reviews, me)
        const team = requestedTeam(detail.reviewRequests, me)
        const sinceLastReview =
          !reviewedSha || reviewedSha === head
            ? undefined
            : prev?.headSha === head && prev.reviewedSha === reviewedSha
              ? prev.sinceLastReview
              : await summarizer.since(pr.repository.nameWithOwner, reviewedSha, head)
        return {
          repo,
          number: pr.number,
          title: pr.title,
          url: pr.url,
          headSha: head,
          ...(headCommittedAt(pr) ? { headCommittedAt: headCommittedAt(pr) } : {}),
          isRerequest: reviewedSha !== undefined,
          ...(reviewedSha ? { reviewedSha } : {}),
          ...(sinceLastReview ? { sinceLastReview } : {}),
          ...(pr.body ? { body: pr.body.slice(0, BODY_CHARS) } : {}),
          author: pr.author?.login ?? 'ghost',
          ...(pr.author?.__typename === 'Bot' ? { isBot: true as const } : {}),
          createdAt: pr.createdAt,
          ...(pr.updatedAt ? { updatedAt: pr.updatedAt } : {}),
          requestedAt: requestedAt(pr, me),
          isDraft: pr.isDraft,
          ...(team ? { team } : {}),
          files: pr.changedFiles,
          additions: pr.additions,
          deletions: pr.deletions,
          ...summary,
        } satisfies InboxItem
      }),
    )
    next.push(...batch)
    await heartbeat()
  }
  return { items: sortItems(next), capped: found.capped }
}

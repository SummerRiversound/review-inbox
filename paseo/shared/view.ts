import type { InboxView } from './rpc'
import type { InboxFile } from './types'

// The fetched file as the panel's three lists: review requests, my PRs, and my issues.
export function toView(file: InboxFile | undefined, fetching: boolean): InboxView {
  const status = fetching ? 'loading' : file?.fetchedAt === undefined ? 'empty' : file.error !== undefined ? 'error' : 'ready'
  return {
    status,
    fetchedAt: file?.fetchedAt ?? null,
    error: file?.error ?? null,
    review: (file?.items ?? []).map(i => ({ key: `${i.repo}#${i.number}`, title: i.title, repo: i.repo, number: i.number, url: i.url, author: i.author, tag: i.isDraft ? 'draft' : null })),
    mine: (file?.mine ?? []).map(pr => ({ key: `${pr.repo}#${pr.number}`, title: pr.title, repo: pr.repo, number: pr.number, url: pr.url, author: null, tag: pr.state })),
    issues: (file?.issues ?? []).map(i => ({ key: `${i.kind}:${i.repo}#${i.number}`, title: i.title, repo: i.repo, number: i.number, url: i.url, author: i.by ?? null, tag: i.kind })),
    capped: { review: file?.capped?.review === true, mine: file?.capped?.mine === true, issues: file?.capped?.issues === true },
  }
}

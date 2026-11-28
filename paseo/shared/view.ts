import { isHidden, itemKey } from './inbox'
import type { InboxView } from './rpc'
import { isIssueHidden, isPrHidden } from './tabs'
import type { AutoState, InboxFile, InboxItem, IssueItem, MyPr } from './types'

// The fetched file as the panel reads it, with what the server alone knows beside it.
export function toView(file: InboxFile | undefined, fetching: boolean, extra: { auto: Record<string, AutoState>; hidden: Record<string, string>; notifies: boolean }): InboxView {
  const status = fetching ? 'loading' : file?.fetchedAt === undefined ? 'empty' : file.error !== undefined ? 'error' : 'ready'
  return {
    status,
    fetchedAt: file?.fetchedAt ?? null,
    error: file?.error ?? null,
    items: file?.items ?? [],
    mine: file?.mine ?? [],
    issues: file?.issues ?? [],
    capped: file?.capped ?? {},
    ...extra,
  }
}

// The review tab's groups in the mod's order: asked of me directly, asked of my team, and drafts, each without what I hid.
export function reviewGroups(view: Pick<InboxView, 'items' | 'hidden'>) {
  const shown = view.items.filter(i => !isHidden(view.hidden, i))
  return {
    direct: shown.filter(i => !i.isDraft && i.team === undefined),
    team: shown.filter(i => !i.isDraft && i.team !== undefined),
    drafts: shown.filter(i => i.isDraft),
    hidden: view.items.length - shown.length,
  }
}

// My work: my open PRs, then issues assigned to me or mentioning me, then mentions of my work elsewhere.
export function workGroups(view: Pick<InboxView, 'mine' | 'issues' | 'hidden'>) {
  const prs = view.mine.filter(pr => !isPrHidden(view.hidden, pr))
  const issues = view.issues.filter(i => !isIssueHidden(view.hidden, i))
  return {
    prs,
    issues: issues.filter(i => i.kind !== 'reference'),
    references: issues.filter(i => i.kind === 'reference'),
    hidden: view.mine.length + view.issues.length - prs.length - issues.length,
  }
}

// What the sidebar row counts: the review requests shown, drafts left out as the mod's band leaves them.
export const sidebarCount = (view: Pick<InboxView, 'items' | 'hidden'>): number => {
  const { direct, team } = reviewGroups(view)
  return direct.length + team.length
}

export const cardKey = (card: InboxItem | MyPr | IssueItem) => ('kind' in card ? `${card.kind}:${itemKey(card)}` : 'state' in card ? `pr:${itemKey(card)}` : itemKey(card))

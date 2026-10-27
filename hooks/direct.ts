import type { DirectAction, DirectTarget, InboxItem, IssueItem, MyPr } from '../types'

// A confirm row left alone goes back to the card's buttons.
export const CONFIRM_MS = 10_000
// A confirm this soon after the press that asked is that press's key repeat or a double tap, not a decision.
export const CONFIRM_GUARD_MS = 300

export type AutoAction = 'post-comment' | 'post-approve' | 'post-changes' | 'discard'
export const AUTO_ACTIONS: AutoAction[] = ['post-comment', 'post-approve', 'post-changes', 'discard']
export const isAutoAction = (action: DirectAction): action is AutoAction => (AUTO_ACTIONS as DirectAction[]).includes(action)

export type AskedAction = 'approve' | 'ready' | 'update-branch' | AutoAction
// Others see these, and none can be taken back, so each is asked on the card first; a discard loses the review's text.
export const needsConfirm = (action: DirectAction): action is AskedAction =>
  action === 'approve' || action === 'ready' || action === 'update-branch' || isAutoAction(action)

// GitHub moves a pending review on with an event; a head that moved since stops it first, as it stops an approve.
export const checksHead = (action: DirectAction) => action === 'approve' || action === 'update-branch' || (isAutoAction(action) && action !== 'discard')

const EVENTS = { 'post-comment': 'COMMENT', 'post-approve': 'APPROVE', 'post-changes': 'REQUEST_CHANGES' } as const

// Only what the card's state makes useful: an approve on a draft or a rerun on a green PR would only fail.
export const reviewActions = (item: InboxItem): DirectAction[] => (item.isDraft ? [] : ['approve'])

export function prActions(pr: MyPr): DirectAction[] {
  return [
    ...(pr.state === 'draft' ? ['ready' as const] : []),
    ...(pr.isBehind && pr.headSha ? ['update-branch' as const] : []),
    ...(pr.state === 'ci-failing' && pr.headSha ? ['rerun' as const] : []),
  ]
}

// Mentions only: an assigned issue is mine already, and a reference is about one of mine.
export const issueActions = (issue: IssueItem): DirectAction[] => (issue.kind === 'mention' ? ['assign'] : [])

// Approved with nothing running: the Merge button fills the prompt, it never merges by itself.
export const canMerge = (pr: MyPr) => pr.state === 'approved' && !pr.ciPending

// The gh call for each write but rerun, which lists the failed runs first; `assignees` takes a PR's number as well as an issue's.
export function writeArgs(action: Exclude<DirectAction, 'rerun'>, target: DirectTarget, login: string, isUndo = false): string[] {
  const path = `repos/${target.repo}`
  switch (action) {
    case 'approve':
      // GitHub takes no new review while my pending one exists, so an approve submits that one.
      if (target.reviewId) return ['api', '-X', 'POST', `${path}/pulls/${target.number}/reviews/${target.reviewId}/events`, '-f', 'event=APPROVE']
      // Pinned to the commit I looked at, with no body: GitHub's own default is an empty approval.
      return ['api', '-X', 'POST', `${path}/pulls/${target.number}/reviews`, '-f', 'event=APPROVE', '-f', `commit_id=${target.sha}`]
    case 'post-comment':
    case 'post-approve':
    case 'post-changes':
      return ['api', '-X', 'POST', `${path}/pulls/${target.number}/reviews/${target.reviewId}/events`, '-f', `event=${EVENTS[action]}`]
    case 'discard':
      return ['api', '-X', 'DELETE', `${path}/pulls/${target.number}/reviews/${target.reviewId}`]
    case 'ready':
      return ['pr', 'ready', `${target.number}`, '--repo', target.repo]
    case 'update-branch':
      // Merge, never rebase: a rebase force-pushes the author's branch. GitHub refuses it if the head moved.
      return ['api', '-X', 'PUT', `${path}/pulls/${target.number}/update-branch`, '-f', `expected_head_sha=${target.sha}`]
    case 'assign':
      return ['api', '-X', isUndo ? 'DELETE' : 'POST', `${path}/issues/${target.number}/assignees`, '-f', `assignees[]=${login}`]
  }
}

export const failedRunsArgs = (target: DirectTarget) => ['api', `repos/${target.repo}/actions/runs?head_sha=${target.sha}&status=failure`, '--jq', '.workflow_runs[].id']
export const rerunArgs = (target: DirectTarget, run: string) => ['api', '-X', 'POST', `repos/${target.repo}/actions/runs/${run}/rerun-failed-jobs`]
export const headArgs = (target: DirectTarget) => ['api', `repos/${target.repo}/pulls/${target.number}`, '--jq', '.head.sha']

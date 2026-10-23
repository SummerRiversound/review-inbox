import type { DirectAction, DirectTarget, InboxItem, IssueItem, MyPr } from '../types'

// A confirm row left alone goes back to the card's buttons.
export const CONFIRM_MS = 10_000
// A confirm this soon after the press that asked is that press's key repeat or a double tap, not a decision.
export const CONFIRM_GUARD_MS = 300

export type AskedAction = 'approve' | 'ready' | 'update-branch'
// Others see these, and none can be taken back, so each is asked on the card first.
export const needsConfirm = (action: DirectAction): action is AskedAction => action === 'approve' || action === 'ready' || action === 'update-branch'

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
      // Pinned to the commit I looked at, with no body: GitHub's own default is an empty approval.
      return ['api', '-X', 'POST', `${path}/pulls/${target.number}/reviews`, '-f', 'event=APPROVE', '-f', `commit_id=${target.sha}`]
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

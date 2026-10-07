export type Impact = { text: string; warn: boolean }

export type InboxItem = {
  repo: string
  number: number
  title: string
  url: string
  headSha: string
  author: string
  createdAt: string
  // When my review (or my team's) was last asked for: what the waiting days count from.
  requestedAt: string
  isDraft: boolean
  // The team my review was asked of; absent when it was asked of me directly.
  team?: string
  files: number
  additions: number
  deletions: number
  summary: string
  why: string
  impact: Impact[]
  // Failed summary attempts on this head commit; retried until it reaches the cap.
  summaryFailed?: number
  isRerequest: boolean
  reviewedSha?: string
  sinceLastReview?: string
}

// My open PR, judged by what I have to do next.
export type MyPrState = 'changes' | 'ci-failing' | 'conflict' | 'waiting' | 'approved' | 'draft'

export type MyPr = {
  repo: string
  number: number
  title: string
  url: string
  createdAt: string
  state: MyPrState
  ciPending: boolean
  // Reviews by others, bots included, left on the current head commit; a new push clears them.
  newReviews: { by: string; at: string }[]
}

// Why an issue or PR is in my issues tab.
export type IssueKind = 'assigned' | 'mention' | 'reference'

export type IssueItem = {
  kind: IssueKind
  repo: string
  number: number
  title: string
  url: string
  at: string
  // reference: who pointed at my item, and which of mine.
  by?: string
  target?: string
}

export type Tab = 'review' | 'mine' | 'issues'

// Shared by every session on the machine; whichever finds it stale fetches and rewrites it.
export type InboxFile = {
  items: InboxItem[]
  mine?: MyPr[]
  issues?: IssueItem[]
  fetchedAt?: number
  // The claim of the session fetching right now, renewed while it works.
  fetchingSince?: number
  fetchingBy?: string
  // Set after a failed fetch: GitHub is retried sooner than a full refresh.
  retryAt?: number
  error?: string
}

export type InboxStatus = {
  kind: 'idle' | 'loading' | 'ready' | 'error'
  message?: string
  updatedAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    'review-inbox': {
      items: InboxItem[]
      mine: MyPr[]
      issues: IssueItem[]
      status: InboxStatus
      hidden: Record<string, string>
      tab: Tab
    }
  }
}

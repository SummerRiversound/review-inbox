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
  via: string
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

// Shared by every session on the machine; whichever finds it stale fetches and rewrites it.
export type InboxFile = {
  items: InboxItem[]
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
    'review-inbox': { items: InboxItem[]; status: InboxStatus; hidden: Record<string, string> }
  }
}

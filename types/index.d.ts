export type Impact = { text: string; warn: boolean }

// A line I wrote on a card, optionally snoozing it: away until `until`, or sooner on the news that ends a hide.
export type Note = {
  text: string
  savedAt: number
  until?: number
  // The card's hide mark when it was snoozed.
  mark?: string
}

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
  // The start of the PR's description, for search.
  body?: string
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
  body?: string
  branch?: string
  base?: string
}

// The next step a card hands to Claude: what blocks my PR, or starting on an issue assigned to me.
export type TaskKind = 'changes' | 'ci-failing' | 'conflict' | 'work'

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
  body?: string
}

export type Tab = 'review' | 'mine' | 'issues'

// What one live session is on, shared with every other: its folder, branch and remotes, and the PRs its prompts linked to.
export type Presence = {
  at: number
  folder: string
  branch?: string
  // GitHub repositories of its remotes, as owner/name.
  remotes: string[]
  prs: string[]
}

// The folder on this machine last seen holding each GitHub repository, as owner/name; shared by every session and account.
export type RepoPaths = Record<string, { path: string; at: number }>

// Shared by every session on the machine; whichever finds it stale fetches and rewrites it.
export type Capped = Partial<Record<Tab, boolean>>

export type InboxFile = {
  items: InboxItem[]
  mine?: MyPr[]
  issues?: IssueItem[]
  // Tabs whose search had more results than one page holds.
  capped?: Capped
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
      capped: Capped
      status: InboxStatus
      hidden: Record<string, string>
      tab: Tab
      // Section ids folded shut, as `<tab>:<category>`.
      collapsed: string[]
      notes: Record<string, Note>
      // What the search field holds; empty shows the tabs.
      query: string
      // The card whose note is being written, or empty.
      editing: string
      // Every live session's entry, this one's included, keyed by session id.
      sessions: Record<string, Presence>
      repos: RepoPaths
      added: string[]
      requested: string[]
    }
  }
}

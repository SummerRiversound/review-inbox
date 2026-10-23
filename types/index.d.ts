export type Impact = { text: string; warn: boolean }

// A line I wrote on a card, optionally snoozing it: away until `until`, or sooner on the news that ends a hide.
export type Note = {
  text: string
  savedAt: number
  until?: number
  // The card's hide mark when it was snoozed.
  mark?: string
}

// Shown beside a card's state: its labels, its comment count, and a PR's base when it is not the default branch.
export type CardDetails = {
  labels?: string[]
  comments?: number
  offBase?: string
}

export type InboxItem = CardDetails & {
  repo: string
  number: number
  title: string
  url: string
  headSha: string
  author: string
  createdAt: string
  // Any activity on the PR; newer than the last close of the drawer marks the card.
  updatedAt?: string
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
export type MyPrState = 'changes' | 'ci-failing' | 'conflict' | 'waiting' | 'approved' | 'queued' | 'draft'

export type MyPr = CardDetails & {
  repo: string
  number: number
  title: string
  url: string
  createdAt: string
  updatedAt?: string
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

export type IssueItem = CardDetails & {
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

export type Tab = 'review' | 'mine' | 'issues' | 'searches' | 'activity'

// A button of my own from actions.json, or a built-in one of the same shape; its prompt is a template filled from the card.
export type ButtonScope = 'review' | 'pr' | 'issue'
export type CardButton = {
  id: string
  name: string
  scope: ButtonScope
  prompt: string
  hidden?: boolean
}
// A search of my own from actions.json, or a built-in one of the same shape: one section of the Searches tab.
export type GroupScope = 'prs' | 'issues'
export type SearchGroup = {
  id: string
  name: string
  // GitHub search syntax; the scope's is:pr or is:issue is added unless it says which.
  query: string
  scope: GroupScope
  countInBand?: boolean
  hidden?: boolean
}
export type GroupHit = { repo: string; number: number; title: string; url: string; author: string; updatedAt: string }
// A group's last results, with the query they answer, so an edited group is fetched again rather than shown stale.
export type GroupResult = { query: string; count: number; hits: GroupHit[]; error?: string }

// A GitHub notification thread, its subject's page as `url`.
export type Thread = { id: string; repo: string; title: string; url: string; reason: string; updatedAt: string; unread: boolean }
export type Activity = {
  threads: Thread[]
  // Sent back as If-Modified-Since, so an unchanged list costs a 304.
  lastModified?: string
  // GitHub's X-Poll-Interval: no look before this.
  pollAfter?: number
  error?: string
  // GitHub refused the notifications (403 or 404).
  noAccess?: boolean
}
// Done or Unsubscribe pressed and not yet sent; `at` tells a later press from an undone one.
export type Settling = { kind: 'done' | 'unsubscribe'; at: number }

// An entry of actions.json left out, by its id or position, or the whole file.
export type ButtonError = { at: string; reason: 'file' | 'fields' | 'scope' | 'variables' | 'groupFields' | 'groupScope'; detail?: string }
export type Actions = { buttons: CardButton[]; groups: SearchGroup[]; errors: ButtonError[] }

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
  // Search group results by group id.
  groups?: Record<string, GroupResult>
  activity?: Activity
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
      // The active tab shows only this session's repositories.
      onlyHere: boolean
      // A band count that just went down, shown in the success color for a moment.
      dropped: string[]
      // actions.json as last read: my buttons and search groups, and the entries left out.
      actions: Actions
      groups: Record<string, GroupResult>
      activity: Activity
      // Threads waiting out their Undo, by thread id, and the threads whose Done or Unsubscribe failed.
      settling: Record<string, Settling>
      settleErrors: Record<string, string>
      // The card whose row of buttons is open, or empty.
      more: string
      // The Edit buttons panel is open.
      buttonsOpen: boolean
      // When the drawer was last closed, read as it opens; 0 before the first close marks nothing new.
      seenAt: number
      added: string[]
      requested: string[]
    }
  }
}

import type { IssueKind, MyPrState, TaskKind } from '../types'
import { de } from './locales/de'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { ja } from './locales/ja'
import { ko } from './locales/ko'
import { ptBR } from './locales/pt-BR'
import { zhCN } from './locales/zh-CN'
import { zhTW } from './locales/zh-TW'

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// English is the schema: every table in ./locales must have the same keys, and the tests check it at runtime too.
const en = {
  title: 'Review inbox',
  command: {
    description: 'Open the review inbox: PRs awaiting my review, my PRs and my issues',
    opened: 'Opened the review inbox.',
  },
  band: {
    open: 'Open',
    reviews: (n: string) => `To review ${n}`,
    prTodo: (n: string) => `My PRs to act on ${n}`,
    issues: (n: string) => `My issues ${n}`,
    searches: (n: string) => `Searches ${n}`,
    oldest: (days: number) => ` · oldest waiting ${count(days, 'day')}`,
  },
  tabs: {
    review: (n: string) => `To review ${n}`,
    mine: (n: string) => `My PRs ${n}`,
    issues: (n: string) => `My issues ${n}`,
    searches: (n: string) => `Searches ${n}`,
    activity: (n: string) => `Activity ${n}`,
  },
  card: {
    rerequest: 're-requested',
    waiting: (days: number) => count(days, 'day'),
    ago: (days: number) => (days === 0 ? 'today' : `${count(days, 'day')} ago`),
    direct: 'direct request',
    team: (team: string) => `team request (${team})`,
    sinceMyReview: 'Since my last review',
    summary: 'Summary',
    why: 'Why',
    impact: 'Impact',
    size: (files: number, added: string, removed: string) => `${count(files, 'file')} (+${added} −${removed})`,
    hide: 'Hide',
    review: 'Review',
    added: 'Added',
    task: {
      changes: 'Address comments',
      'ci-failing': 'Fix CI',
      conflict: 'Resolve conflict',
      work: 'Work on this',
    } satisfies Record<TaskKind, string>,
    here: 'this folder',
    at: (path: string) => `in ${path}`,
    noClone: 'no local clone',
    ciRunning: ' · CI running',
    thisRepo: 'this repo',
    comments: (n: number) => count(n, 'comment'),
    newReview: (who: string) => `New review · ${who}`,
    referenced: (by: string, target: string) => `${by} referenced my ${target}`,
  },
  state: {
    changes: 'Changes requested',
    'ci-failing': 'CI failing',
    conflict: 'Merge conflict',
    waiting: 'Waiting for review',
    approved: 'Approved',
    queued: 'In merge queue',
    draft: 'Draft',
  } satisfies Record<MyPrState, string>,
  issueKind: {
    assigned: 'Assigned to me',
    mention: 'Mentions me',
    reference: 'References my work',
  } satisfies Record<IssueKind, string>,
  status: {
    loading: 'Loading…',
    error: (message: string) => `Could not load; retrying in a minute (${message})`,
    updated: (minutes: number) => (minutes < 1 ? 'Updated just now' : `Updated ${minutes} min ago`),
    firstFetch: 'Fetching from GitHub. The first time takes about a minute.',
    timeout: 'GitHub timed out; narrow the Search scope setting, e.g. org:my-org',
  },
  empty: {
    zero: '✓ Nothing needs you',
    review: 'No PRs are waiting for your review.',
    mine: 'You have no open PRs.',
    issues: 'No issues are assigned to you or mention you.',
    searches: "No search groups. Add one under Edit buttons.",
    activity: "No other notifications. Review requests, assignments and mentions are on the other tabs.",
  },
  sections: {
    here: (n: number) => `This repo ${n}`,
    all: (n: number) => `All ${n}`,
    session: (n: number) => `In progress in a session ${n}`,
    hidden: (n: number) => `${n} hidden · show all`,
    direct: (n: number) => `Direct requests ${n}`,
    team: (n: number) => `Team requests ${n}`,
    drafts: (n: number) => `Drafts · not ready for review ${n}`,
    references: (days: number, n: number) => `Last ${days} days · my work referenced elsewhere ${n}`,
  },
  note: {
    edit: 'Note',
    label: 'Note',
    placeholder: 'What you looked at or plan to do',
    save: 'Save',
    tomorrow: 'Snooze until tomorrow',
    nextWeek: 'Snooze until next week',
    cancel: 'Cancel',
    clear: 'Clear',
    shown: (text: string) => `Note: ${text}`,
    until: (month: number, day: number) => `snoozed until ${month}/${day}`,
  },
  session: {
    here: 'this session',
    at: (names: string) => `Working in ${names}`,
  },
  search: {
    label: 'Search',
    placeholder: 'repo, #number, title, description or note',
    empty: 'Nothing matches.',
    hidden: 'hidden',
  },
  toast: {
    back: 'Back from snooze',
    added: (n: number) => `${count(n, 'card')} added · Esc puts their requests in the prompt`,
    newRequest: 'New review request',
    moreRequests: (n: number) => count(n, 'more review request'),
    morePrAlerts: (n: number) => `${count(n, 'more alert')} on my PRs`,
    moreIssueAlerts: (n: number) => count(n, 'more issue alert'),
    promptBusy: 'The prompt is busy. Close the open dialog and press again.',
    retry: 'Try again in a moment.',
  },
  alert: {
    ready: 'Ready to merge',
    turned: (state: string) => `My PR: ${state}`,
    reviewed: 'New review on my PR',
    by: (who: string) => `new review ${who}`,
  },
  buttons: {
    more: "More",
    edit: "Edit buttons",
    add: "Add button",
    addGroup: "Add search group",
    none: "No buttons of my own yet; the built-in ones are shown.",
    file: (path: string) => `My buttons: ${path}`,
    tooMany: (n: number, scope: string) => `${n} buttons on ${scope} cards; past 20 the row gets hard to scan`,
    scopes: { review: "review", pr: "my PR", issue: "issue" },
    errors: {
      file: "not JSON with a \"buttons\" or \"groups\" list; only the built-in ones are shown",
      fields: "needs an id, a name and a prompt",
      scope: (scope: string) => `scope "${scope}" is not review, pr or issue`,
      variables: (names: string) => `unknown variable ${names}`,
      groupFields: "a search group needs an id, a name and a query",
      groupScope: (scope: string) => `search group scope "${scope}" is not prs or issues`,
    },
    builtIn: {
      "summarize-risks": { name: "Summarize risks", prompt: "Summarize the risks in {{.PrUrl}}: read the diff with `gh pr diff {{.PrUrl}}` and list what could break, for whom, and what to test first. Change nothing." },
      "explain-diff": { name: "Explain this diff", prompt: "Explain the diff of {{.PrUrl}} file by file in plain language, so I can review it quickly; read it with `gh pr diff {{.PrUrl}}`." },
      "draft-approval": { name: "Draft approval comment", prompt: "Draft an approval comment for {{.PrUrl}}: one or two sentences on what is good, then any small follow-ups. Read the diff with `gh pr diff {{.PrUrl}}`. Do not post it; show it to me." },
      "draft-reply": { name: "Draft reply to reviewer", prompt: "Draft a reply to each reviewer on {{.PrUrl}}; read their comments with `gh pr view {{.PrUrl}} --comments`. Do not post anything; show me the drafts." },
      "investigate-ci": { name: "Investigate CI failure", prompt: "Investigate the CI failure on {{.PrUrl}}: find the failing checks with `gh pr checks {{.PrUrl}}` and their logs with `gh run view <run-id> --log-failed`, then tell me the cause and the fix. Change nothing yet." },
    },
  },
  searches: {
    builtIn: { 'involves-me': "Involves me", 'reviewed-by-me': "Reviewed by me, still open", 'my-open-issues': "My open issues" },
    none: "Nothing found.",
    failed: (message: string) => `Search failed: ${message}`,
    more: (n: number) => `${n} more on GitHub`,
    tooMany: (n: number) => `${n} search groups past the first 15 are left out`,
  },
  activity: {
    reasons: { comment: "Comment", state_change: "State changed", author: "You opened it", team_mention: "Team mentioned", security_alert: "Security alert" },
    done: "Done",
    unsubscribe: "Unsubscribe",
    wasDone: "Done",
    wasUnsubscribed: "Unsubscribed",
    undo: "Undo",
    failed: (message: string) => `Could not update the notification: ${message}`,
    noAccess: "No access to notifications. GitHub gives them only to gh's own sign-in or a classic token: run gh auth login, or gh auth refresh -s notifications.",
  },
  prompt: {
    addButton: (path: string, names: string) => `Add a button to my review inbox by editing ${path}; create it as {"buttons": []} if it is missing. Each entry is {"id", "name", "scope": "review" | "pr" | "issue", "prompt"}, and the prompt may use {{.Name}} with ${names}. Ask me what the button should do first.`,
    addGroup: (path: string) => `Add a search group to my review inbox by editing ${path}; create it as {"groups": []} if it is missing and keep any "buttons" in it. Each entry is {"id", "name", "query", "scope": "prs" | "issues"}, with "countInBand": true to count it in the band; the query is GitHub search syntax. Ask me what it should find first.`,
    review: (url: string) => `Review ${url}.`,
    check: 'Check in particular: ',
    since: 'Changed since my last review: ',
    style: 'My usual review style: ',
    // Commands, not data: Claude reads the comments, checks and logs itself, so no outside text lands in the prompt.
    task: {
      changes: (url: string) => `Address the unresolved review comments on ${url}; read them with \`gh pr view ${url} --comments\`.`,
      'ci-failing': (url: string) =>
        `Fix the failing CI on ${url}: find the failing checks with \`gh pr checks ${url}\` and their logs with \`gh run view <run-id> --log-failed\`.`,
      conflict: (url: string, base?: string) =>
        `Resolve the merge conflict on ${url}: merge ${base ? `origin/${base}` : 'its base branch'} into its branch.`,
      work: (url: string) => `Work on ${url}: read the issue, plan the change, and start on a new branch.`,
    } satisfies Record<TaskKind, (url: string, base?: string) => string>,
    here: 'this folder',
    workIn: (where: string, isPr: boolean) =>
      isPr
        ? `Work in ${where}, in a new worktree with the PR checked out (\`gh pr checkout\` handles forks); leave the folder's current branch as it is.`
        : `Work in ${where}, in a new worktree on a new branch; leave the folder's current branch as it is.`,
    noClone: (repo: string) => `No local clone of ${repo} is known: ask me where it is, or offer \`gh repo clone ${repo}\` and wait for my yes.`,
  },
  summaryFailed: (reason: string) => `Could not write a summary (${reason}).`,
  // The language lines of the model instructions; the rest of the rules are shared.
  model: {
    language: 'Write in plain English, as if explaining to a junior developer.',
    sentence: 'Each sentence about 15 words, one idea per sentence.',
    filler: 'No filler words such as effectively, overall, various, seamless.',
    bad: 'Refactored the UserCache class to unify the SessionStore lookup path.',
    good: 'Fixes the profile picture that sometimes showed blank right after login.',
    since: 'Write in plain English, one or two short sentences, about 15 words each.',
    style: 'Write in plain English.',
  },
}

export type Messages = typeof en

export const LANGUAGES = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'pt-BR', 'de', 'fr'] as const
export type Language = (typeof LANGUAGES)[number]

export const MESSAGES: Record<Language, Messages> = { en, ko, ja, 'zh-CN': zhCN, 'zh-TW': zhTW, es, 'pt-BR': ptBR, de, fr }

export const isLanguage = (value: unknown): value is Language => (LANGUAGES as readonly unknown[]).includes(value)

// A code must end where the value ends or at a region or encoding separator, so "kotlin" or "default" names no language.
const NAMES: [Language, RegExp][] = [
  ['ko', /^(kor?([-_.@]|$)|korean|한국|한글)/],
  ['en', /^(eng?([-_.@]|$)|english|영어)/],
  ['ja', /^((ja|jpn?)([-_.@]|$)|japanese|日本)/],
  ['es', /^((es|spa)([-_.@]|$)|spanish|espa[ñn]ol|castellano)/],
  ['pt-BR', /^((pt|por)([-_.@]|$)|portuguese|portugu[eê]s)/],
  ['de', /^((de|deu|ger)([-_.@]|$)|german|deutsch)/],
  ['fr', /^((fr|fra|fre)([-_.@]|$)|french|fran[çc]ais)/],
]

// Claude Code's `language` setting is free text ("日本語", "Korean", "zh-TW"), and a locale reads "ja_JP.UTF-8".
function recognize(value: unknown): Language | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  // Chinese, named anywhere ("Simplified Chinese"), reads Simplified unless it carries a Taiwan, Hong Kong, Macau or Traditional mark.
  if (/^(zh|zho|chi)([-_.@]|$)|chinese|中文|汉语|漢語|简体|簡體|繁體|繁体|正體/.test(v)) {
    return /[-_](tw|hk|mo|hant)\b|traditional|繁|正體/.test(v) ? 'zh-TW' : 'zh-CN'
  }
  return NAMES.find(([, pattern]) => pattern.test(v))?.[0]
}

// The plugin option wins; `auto` follows Claude Code's language setting, then the system locale, then English.
export function pickLanguage(option: unknown, claudeLanguage: unknown, locale: unknown): Language {
  if (isLanguage(option)) return option
  return recognize(claudeLanguage) ?? recognize(locale) ?? 'en'
}

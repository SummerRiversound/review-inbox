import type { IssueKind, MyPrState } from '../types'
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
    reviews: (n: number) => `To review ${n}`,
    prTodo: (n: number) => `My PRs to act on ${n}`,
    issues: (n: number) => `My issues ${n}`,
    oldest: (days: number) => ` · oldest waiting ${count(days, 'day')}`,
  },
  tabs: {
    review: (n: number) => `To review ${n}`,
    mine: (n: number) => `My PRs ${n}`,
    issues: (n: number) => `My issues ${n}`,
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
    ciRunning: ' · CI running',
    newReview: (who: string) => `New review · ${who}`,
    referenced: (by: string, target: string) => `${by} referenced my ${target}`,
  },
  state: {
    changes: 'Changes requested',
    'ci-failing': 'CI failing',
    conflict: 'Merge conflict',
    waiting: 'Waiting for review',
    approved: 'Approved',
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
  },
  empty: {
    review: 'No PRs are waiting for your review.',
    mine: 'You have no open PRs.',
    issues: 'No issues are assigned to you or mention you.',
  },
  sections: {
    hidden: (n: number) => `${n} hidden · show all`,
    drafts: (n: number) => `Drafts · not ready for review ${n}`,
    references: (days: number, n: number) => `Last ${days} days · my work referenced elsewhere ${n}`,
  },
  toast: {
    added: (n: number) => `${count(n, 'PR')} added · Esc puts their review requests in the prompt`,
    newRequest: 'New review request',
    moreRequests: (n: number) => count(n, 'more review request'),
    morePrAlerts: (n: number) => `${count(n, 'more alert')} on my PRs`,
    moreIssueAlerts: (n: number) => count(n, 'more issue alert'),
    promptBusy: 'The prompt is busy. Close the open dialog and press again.',
    retry: 'Try again in a moment.',
  },
  alert: {
    turned: (state: string) => `My PR: ${state}`,
    reviewed: 'New review on my PR',
    by: (who: string) => `new review ${who}`,
  },
  prompt: {
    review: (url: string) => `Review ${url}.`,
    check: 'Check in particular: ',
    since: 'Changed since my last review: ',
    style: 'My usual review style: ',
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

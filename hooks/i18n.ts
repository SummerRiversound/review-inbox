import type { IssueKind, MyPrState } from '../types'

export type Language = 'en' | 'ko'

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// English is the schema: the Korean table must have the same keys, and the tests check it at runtime too.
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
    summary: 'Summary: ',
    check: 'Check in particular: ',
    since: 'Changed since my last review: ',
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
  },
}

export type Messages = typeof en

const ko: Messages = {
  title: '리뷰 인박스',
  command: {
    description: '리뷰 인박스 열기: 내 리뷰를 기다리는 PR, 내 PR, 내 이슈',
    opened: '리뷰 인박스를 열었습니다.',
  },
  band: {
    open: '열기',
    reviews: n => `리뷰 ${n}`,
    prTodo: n => `내 PR 할 일 ${n}`,
    issues: n => `내 이슈 ${n}`,
    oldest: days => ` · 가장 오래된 리뷰 ${days}일째`,
  },
  tabs: {
    review: n => `리뷰 대기 ${n}`,
    mine: n => `내 PR ${n}`,
    issues: n => `내 이슈 ${n}`,
  },
  card: {
    rerequest: '재요청',
    waiting: days => `${days}일째`,
    ago: days => (days === 0 ? '오늘' : `${days}일 전`),
    direct: '직접 요청',
    team: team => `팀 요청 (${team})`,
    sinceMyReview: '지난 내 리뷰 이후',
    summary: '요약',
    why: 'PR 이유',
    impact: '영향 범위',
    size: (files, added, removed) => `파일 ${files}개 (+${added} −${removed})`,
    hide: '숨기기',
    review: '리뷰하기',
    ciRunning: ' · CI 진행 중',
    newReview: who => `새 리뷰 · ${who}`,
    referenced: (by, target) => `${by}님이 내 ${target}을(를) 언급`,
  },
  state: {
    changes: '변경 요청',
    'ci-failing': 'CI 실패',
    conflict: '충돌',
    waiting: '리뷰 대기',
    approved: '승인됨',
    draft: '초안',
  },
  issueKind: {
    assigned: '나에게 할당',
    mention: '나를 언급',
    reference: '내 작업을 언급',
  },
  status: {
    loading: '불러오는 중…',
    error: message => `불러오지 못해 1분 뒤 다시 시도합니다 (${message})`,
    updated: minutes => (minutes < 1 ? '방금 갱신' : `${minutes}분 전 갱신`),
    firstFetch: 'GitHub에서 목록을 가져오고 있습니다. 처음에는 1분 정도 걸립니다.',
  },
  empty: {
    review: '지금 리뷰를 기다리는 PR이 없습니다.',
    mine: '열려 있는 내 PR이 없습니다.',
    issues: '나에게 할당되거나 나를 언급한 이슈가 없습니다.',
  },
  sections: {
    hidden: n => `숨김 ${n} · 모두 보이기`,
    drafts: n => `초안 · 아직 리뷰 준비 전 ${n}`,
    references: (days, n) => `최근 ${days}일 · 다른 곳에서 내 작업을 언급 ${n}`,
  },
  toast: {
    newRequest: '새 리뷰 요청',
    moreRequests: n => `새 리뷰 요청이 ${n}건 더 있습니다`,
    morePrAlerts: n => `내 PR 알림이 ${n}건 더 있습니다`,
    moreIssueAlerts: n => `내 이슈 알림이 ${n}건 더 있습니다`,
    promptBusy: '입력창을 지금 쓸 수 없습니다. 열린 창을 닫고 다시 눌러 주세요.',
    retry: '잠시 후 다시 눌러 주세요.',
  },
  alert: {
    turned: state => `내 PR ${state}`,
    reviewed: '내 PR 새 리뷰',
    by: who => `새 리뷰 ${who}`,
  },
  prompt: {
    review: url => `${url} 리뷰해 줘.`,
    summary: '요약: ',
    check: '특히 확인할 점: ',
    since: '지난 내 리뷰 이후 바뀐 점: ',
  },
  summaryFailed: reason => `요약을 만들지 못했습니다 (${reason}).`,
  model: {
    language: 'Write in Korean, formal 합니다체, as if explaining to a junior developer.',
    sentence: 'Each sentence about 40 Korean characters, one idea per sentence.',
    filler: 'No filler words such as 효과적으로, 전반적으로, 다양한.',
    bad: 'UserCache 클래스를 리팩터링하여 SessionStore의 조회 경로를 통합했습니다.',
    good: '로그인 직후 프로필 사진이 가끔 비어 보이던 문제를 고쳤습니다.',
    since: 'Write in Korean, formal 합니다체, one or two short sentences, about 40 Korean characters each.',
  },
}

export const MESSAGES: Record<Language, Messages> = { en, ko }

// Claude Code's `language` setting is free text ("한국어", "Korean", "ko-KR"), and a locale reads "ko_KR.UTF-8".
function recognize(value: unknown): Language | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  if (/^(kor?([-_.@]|$)|korean|한국|한글)/.test(v)) return 'ko'
  if (/^(eng?([-_.@]|$)|english|영어)/.test(v)) return 'en'
  return undefined
}

// The plugin option wins; `auto` follows Claude Code's language setting, then the system locale, then English.
export function pickLanguage(option: unknown, claudeLanguage: unknown, locale: unknown): Language {
  if (option === 'en' || option === 'ko') return option
  return recognize(claudeLanguage) ?? recognize(locale) ?? 'en'
}

import { defineTranslations, useTranslation } from '@getpaseo/plugin/client'
import { MESSAGES, pickLanguage } from '../shared/i18n'

// Words the mod has no use for. Everything else on screen is the mod's own table, in the app's language.
const en = {
  refresh: 'Refresh',
  autoRunning: 'auto review running',
  noAgent: 'Open an agent first: the request goes into its prompt.',
  pending: 'Pending review',
  ghMissing: 'GitHub CLI (gh) is not installed on the machine running Paseo. Install it from cli.github.com, then sign in with gh auth login.',
  github: 'Open on GitHub',
  settings: {
    title: 'Review inbox',
    scope: 'Search scope',
    scopeHint: 'GitHub search qualifiers added to every list, for example org:my-org',
    account: 'GitHub account',
    accountHint: 'The gh login to read GitHub as; empty uses gh’s active account',
    save: 'Save',
    auto: 'Auto review',
    autoOn: 'Review requests automatically',
    autoHint: 'A background agent reviews each PR that asks for my review and leaves the result as my pending review',
    reviewer: 'Reviewer',
    reviewerHint: 'Paseo provider/model, for example claude/claude-opus-5-5',
    daily: 'Reviews a day',
    dailyHint: 'The most reviews started in a day; empty has no limit',
    settle: 'Wait after the last commit (minutes)',
    settleHint: 'Authors often push again right after asking; 0 starts at once',
    skills: 'Skills',
    skillsHint: 'Skills the reviewer loads, comma-separated',
    invalidNumber: 'Enter a whole number of 0 or more',
  },
}

const ko: typeof en = {
  refresh: '새로고침',
  autoRunning: '자동 리뷰 진행 중',
  noAgent: '먼저 에이전트를 열어 주세요. 요청은 그 입력창에 들어갑니다.',
  pending: '임시 리뷰 보기',
  ghMissing: 'Paseo가 도는 기기에 GitHub CLI(gh)가 없습니다. cli.github.com에서 설치한 뒤 gh auth login으로 로그인하세요.',
  github: 'GitHub에서 열기',
  settings: {
    title: '리뷰 인박스',
    scope: '검색 범위',
    scopeHint: '모든 목록에 붙는 GitHub 검색 조건, 예: org:my-org',
    account: 'GitHub 계정',
    accountHint: 'GitHub을 읽을 gh 로그인 계정; 비우면 gh의 활성 계정',
    save: '저장',
    auto: '자동 리뷰',
    autoOn: '리뷰 요청을 자동으로 리뷰',
    autoHint: '내 리뷰를 요청한 PR마다 백그라운드 에이전트가 리뷰하고, 결과를 내 임시 리뷰로 남깁니다',
    reviewer: '리뷰어',
    reviewerHint: 'Paseo provider/model, 예: claude/claude-opus-5-5',
    daily: '하루 리뷰 수',
    dailyHint: '하루에 시작하는 최대 리뷰 수; 비우면 제한 없음',
    settle: '마지막 커밋 뒤 대기(분)',
    settleHint: '작성자가 요청 직후 다시 푸시하는 일이 많아서 기다립니다; 0이면 바로 시작',
    skills: '스킬',
    skillsHint: '리뷰어가 불러올 스킬, 쉼표로 구분',
    invalidNumber: '0 이상의 정수를 넣어 주세요',
  },
}

export const messages = defineTranslations({ resources: { en, ko } })

// The mod's words in the app's language, beside this plugin's own.
export const useMessages = () => {
  const { locale, t } = useTranslation(messages)
  return { m: MESSAGES[pickLanguage(undefined, undefined, locale)], t }
}

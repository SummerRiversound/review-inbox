import { defineTranslations, useTranslation } from '@getpaseo/plugin/client'
import { MESSAGES, pickLanguage } from '../shared/i18n'

// Words the mod has no use for. Everything else on screen is the mod's own table, in the app's language.
const en = {
  refresh: 'Refresh',
  settings: {
    title: 'Review inbox',
    scope: 'Search scope',
    scopeHint: 'GitHub search qualifiers added to every list, for example org:my-org',
    account: 'GitHub account',
    accountHint: 'The gh login to read GitHub as; empty uses gh’s active account',
    save: 'Save',
  },
}

const ko: typeof en = {
  refresh: '새로고침',
  settings: {
    title: '리뷰 인박스',
    scope: '검색 범위',
    scopeHint: '모든 목록에 붙는 GitHub 검색 조건, 예: org:my-org',
    account: 'GitHub 계정',
    accountHint: 'GitHub을 읽을 gh 로그인 계정; 비우면 gh의 활성 계정',
    save: '저장',
  },
}

export const messages = defineTranslations({ resources: { en, ko } })

// The mod's words in the app's language, beside this plugin's own.
export const useMessages = () => {
  const { locale, t } = useTranslation(messages)
  return { m: MESSAGES[pickLanguage(undefined, undefined, locale)], t }
}

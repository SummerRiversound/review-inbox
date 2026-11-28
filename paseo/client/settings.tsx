import { type PluginSurfaceProps, useSettings } from '@getpaseo/plugin/client'
import { Loading, SettingsAction, SettingsCard, SettingsInput, SettingsSection, SettingsSwitch } from '@getpaseo/plugin/client/ui'
import { useState } from 'react'
import { Text } from 'react-native'
import { type InboxConfig, inboxSettings } from '../shared/settings'
import { useMessages } from './messages'

// A whole number of 0 or more; empty is `empty`, anything else undefined.
const wholeOr = <T,>(text: string, empty: T): number | T | undefined => {
  if (text.trim() === '') return empty
  const n = Number(text)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export function InboxSettings({ theme }: PluginSurfaceProps) {
  const { t } = useMessages()
  const state = useSettings(inboxSettings)
  const [draft, setDraft] = useState<Partial<Record<keyof InboxConfig, string | boolean>>>({})
  if (state.status === 'loading') return <Loading />
  if (state.status !== 'ready') return <Text style={{ color: theme.colors.statusDanger }}>{state.error}</Text>
  const v = state.values
  const text = (key: 'scope' | 'githubUser' | 'reviewer' | 'skills') => String(draft[key] ?? v[key]).trim()
  const daily = wholeOr(String(draft.daily ?? v.daily ?? ''), null)
  const settle = wholeOr(String(draft.settleMinutes ?? v.settleMinutes), 0)
  const next: InboxConfig | undefined =
    daily === undefined || settle === undefined
      ? undefined
      : { scope: text('scope'), githubUser: text('githubUser'), autoReview: draft.autoReview === undefined ? v.autoReview : draft.autoReview === true, reviewer: text('reviewer') || v.reviewer, daily, settleMinutes: settle, skills: text('skills') }
  const set = (key: keyof InboxConfig) => (value: string | boolean) => setDraft(d => ({ ...d, [key]: value }))
  return (
    <>
      <SettingsSection title={t('settings.title')}>
        <SettingsCard>
          <SettingsInput label={t('settings.scope')} hint={t('settings.scopeHint')} initialValue={v.scope} placeholder="org:my-org" onChangeText={set('scope')} />
          <SettingsInput label={t('settings.account')} hint={t('settings.accountHint')} initialValue={v.githubUser} onChangeText={set('githubUser')} />
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title={t('settings.auto')}>
        <SettingsCard>
          <SettingsSwitch label={t('settings.autoOn')} hint={t('settings.autoHint')} value={next?.autoReview ?? v.autoReview} onValueChange={set('autoReview')} />
          <SettingsInput label={t('settings.reviewer')} hint={t('settings.reviewerHint')} initialValue={v.reviewer} onChangeText={set('reviewer')} />
          <SettingsInput label={t('settings.daily')} hint={t('settings.dailyHint')} error={daily === undefined ? t('settings.invalidNumber') : null} initialValue={v.daily === null ? '' : String(v.daily)} onChangeText={set('daily')} />
          <SettingsInput label={t('settings.settle')} hint={t('settings.settleHint')} error={settle === undefined ? t('settings.invalidNumber') : null} initialValue={String(v.settleMinutes)} onChangeText={set('settleMinutes')} />
          <SettingsInput label={t('settings.skills')} hint={t('settings.skillsHint')} initialValue={v.skills} onChangeText={set('skills')} />
        </SettingsCard>
      </SettingsSection>
      <SettingsAction
        label=""
        actionLabel={t('settings.save')}
        error={state.saveError}
        disabled={state.saving || next === undefined || JSON.stringify(next) === JSON.stringify(v)}
        onPress={() => next && void state.save(next, state.revision).then(ok => ok && setDraft({}))}
      />
    </>
  )
}

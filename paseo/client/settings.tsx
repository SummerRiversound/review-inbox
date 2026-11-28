import { type PluginSurfaceProps, useSettings } from '@getpaseo/plugin/client'
import { Loading, SettingsAction, SettingsCard, SettingsInput, SettingsSection } from '@getpaseo/plugin/client/ui'
import { useState } from 'react'
import { Text } from 'react-native'
import { inboxSettings } from '../shared/settings'
import { useMessages } from './messages'

export function InboxSettings({ theme }: PluginSurfaceProps) {
  const { t } = useMessages()
  const state = useSettings(inboxSettings)
  const [draft, setDraft] = useState<{ scope?: string; githubUser?: string }>({})
  if (state.status === 'loading') return <Loading />
  if (state.status !== 'ready') return <Text style={{ color: theme.colors.statusDanger }}>{state.error}</Text>
  const next = { ...state.values, ...draft }
  return (
    <SettingsSection title={t('settings.title')}>
      <SettingsCard>
        <SettingsInput label={t('settings.scope')} hint={t('settings.scopeHint')} initialValue={state.values.scope} placeholder="org:my-org" onChangeText={scope => setDraft(d => ({ ...d, scope }))} />
        <SettingsInput label={t('settings.account')} hint={t('settings.accountHint')} initialValue={state.values.githubUser} onChangeText={githubUser => setDraft(d => ({ ...d, githubUser }))} />
        <SettingsAction
          label=""
          actionLabel={t('settings.save')}
          error={state.saveError}
          disabled={state.saving || (next.scope === state.values.scope && next.githubUser === state.values.githubUser)}
          onPress={() => void state.save({ scope: next.scope.trim(), githubUser: next.githubUser.trim() }, state.revision).then(ok => ok && setDraft({}))}
        />
      </SettingsCard>
    </SettingsSection>
  )
}

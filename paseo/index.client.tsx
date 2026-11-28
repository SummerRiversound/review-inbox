import type { PluginClientContext } from '@getpaseo/plugin/client'
import { InboxPanel } from './client/panel'
import { messages } from './client/messages'
import { InboxSettings } from './client/settings'

export default function contribute(client: PluginClientContext) {
  const title = messages.message('settings.title')
  const removePanel = client.addWorkspacePanel({ id: 'inbox', title, icon: 'Inbox', locations: ['explorer'], Component: InboxPanel })
  const removeItem = client.addCommandCenterItem({
    id: 'open-inbox',
    title,
    icon: 'Inbox',
    context: 'workspace',
    onSelect({ openPanel }) {
      openPanel('inbox', { location: 'explorer' })
    },
  })
  const removeSettings = client.addSettingsScreen({ id: 'inbox', title, icon: 'Inbox', Component: InboxSettings })
  return () => {
    removePanel()
    removeItem()
    removeSettings()
  }
}

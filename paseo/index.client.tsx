import type { PluginClientContext } from '@getpaseo/plugin/client'
import { messages } from './client/messages'
import { InboxPanel, InboxScreen } from './client/panel'
import { InboxSettings } from './client/settings'
import { InboxSidebarItem } from './client/sidebar'

export default function contribute(client: PluginClientContext) {
  const title = messages.message('settings.title')
  const removers = [
    client.addWorkspacePanel({ id: 'inbox', title, icon: 'Inbox', locations: ['explorer'], Component: InboxPanel }),
    client.addScreen({ id: 'inbox', title, Component: InboxScreen }),
    client.addSidebarHeaderItem({ id: 'inbox', title, Component: InboxSidebarItem }),
    client.addCommandCenterItem({
      id: 'open-inbox',
      title,
      icon: 'Inbox',
      context: 'workspace',
      onSelect({ openPanel }) {
        openPanel('inbox', { location: 'explorer' })
      },
    }),
    client.addSettingsScreen({ id: 'inbox', title, icon: 'Inbox', Component: InboxSettings }),
  ]
  return () => removers.forEach(remove => remove())
}

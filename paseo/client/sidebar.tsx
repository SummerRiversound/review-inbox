import { type PluginSidebarItemProps } from '@getpaseo/plugin/client'
import { SidebarRow, useToast } from '@getpaseo/plugin/client/ui'
import { useEffect, useRef } from 'react'
import { Text, View } from 'react-native'
import { ageColor, newArrivals, shownReady, waitingDays } from '../shared/inbox'
import { reviewGroups } from '../shared/view'
import { useInbox } from './inbox'
import { useMessages } from './messages'

// "Review inbox 3" in the sidebar, coloured by the longest wait, as the mod's band; pressing it opens the inbox screen.
// Without device notifications (Paseo before 0.18) a new review request shows as a toast while the app is open.
export function InboxSidebarItem({ theme, currentScreen, openScreen }: PluginSidebarItemProps) {
  const { m } = useMessages()
  const q = useInbox()
  const toast = useToast()
  const seen = useRef<string[] | undefined>(undefined)
  const view = q.data
  const items = view?.items
  useEffect(() => {
    if (items === undefined || view?.fetchedAt == null) return
    if (view.notifies !== true) for (const item of newArrivals(seen.current, items)) toast.show(`${m.toast.newRequest} · ${item.repo} #${item.number}`)
    seen.current = shownReady(items)
  }, [items, view?.fetchedAt, view?.notifies, toast, m])

  const groups = view === undefined ? undefined : reviewGroups(view)
  const waiting = groups === undefined ? [] : [...groups.direct, ...groups.team]
  const oldest = Math.max(-1, ...waiting.map(i => waitingDays(i.requestedAt, Date.now())))
  const tone = oldest < 0 ? 'subtle' : ageColor(oldest)
  const c = theme.colors
  const background = tone === 'error' ? c.statusDanger : tone === 'warning' ? c.statusWarning : c.surface2
  return (
    <SidebarRow
      icon="Inbox"
      active={currentScreen?.screenId === 'inbox'}
      onPress={() => openScreen({ screenId: 'inbox' })}
      trailing={
        waiting.length > 0 ? (
          <View style={{ minWidth: 20, paddingHorizontal: 6, borderRadius: 6, alignItems: 'center', backgroundColor: background }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: tone === 'subtle' ? c.foreground : c.accentForeground }}>{waiting.length}</Text>
          </View>
        ) : undefined
      }
    />
  )
}

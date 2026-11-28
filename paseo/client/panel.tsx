import { openExternalUrl, type PluginWorkspacePanelProps, useTabState } from '@getpaseo/plugin/client'
import { Icon, Loading } from '@getpaseo/plugin/client/ui'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import type { InboxRow, InboxView } from '../shared/rpc'
import { atLeast } from '../shared/tabs'
import { useInbox, useRefresh } from './inbox'
import { useMessages } from './messages'

const TABS = ['review', 'mine', 'issues'] as const
type TabKey = (typeof TABS)[number]

export function InboxPanel({ theme, layout, tab }: PluginWorkspacePanelProps) {
  const { m, t } = useMessages()
  const q = useInbox()
  const refresh = useRefresh()
  const [open, setOpen] = useTabState(tab, z.enum(TABS), 'review')
  const c = theme.colors
  const s = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: c.surface0 },
      head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: layout.compact ? 12 : 16, paddingVertical: 10 },
      status: { flex: 1, color: c.foregroundMuted, fontSize: 12 },
      tabs: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, paddingHorizontal: layout.compact ? 12 : 16, paddingBottom: 8 },
      tab: (on: boolean) => ({ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: on ? c.surface2 : 'transparent', borderWidth: 1, borderColor: on ? c.border : 'transparent' }),
      tabText: (on: boolean) => ({ color: on ? c.foreground : c.foregroundMuted, fontSize: 13 }),
      row: { paddingHorizontal: layout.compact ? 12 : 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
      title: { color: c.foreground, fontSize: 14 },
      sub: { color: c.foregroundMuted, fontSize: 12, marginTop: 2 },
      summary: { color: c.foreground, fontSize: 13, marginTop: 2 },
      empty: { color: c.foregroundMuted, fontSize: 13, padding: layout.compact ? 12 : 16 },
      error: { color: c.statusDanger, fontSize: 12, paddingHorizontal: layout.compact ? 12 : 16, paddingBottom: 8 },
    }),
    [c, layout.compact],
  )

  if (q.isPending) return <Loading />
  const view: InboxView | undefined = q.data
  if (view === undefined) return <Text style={s.empty}>{m.status.error(q.error instanceof Error ? q.error.message : String(q.error))}</Text>

  const tag = (key: TabKey, row: InboxRow): string | null => {
    if (row.tag === null) return null
    if (key === 'review') return m.state.draft
    if (key === 'mine') return m.state[row.tag as keyof typeof m.state] ?? row.tag
    return m.issueKind[row.tag as keyof typeof m.issueKind] ?? row.tag
  }
  const label = (key: TabKey) => m.tabs[key](atLeast(view[key].length, view.capped[key]))
  const rows = view[open]
  const status =
    view.status === 'loading'
      ? view.fetchedAt === null ? m.status.firstFetch : m.status.loading
      : view.fetchedAt === null ? m.status.firstFetch : m.status.updated(Math.floor((Date.now() - view.fetchedAt) / 60_000))

  return (
    <View style={s.screen}>
      <View style={s.head}>
        <Text style={s.status} accessibilityLiveRegion="polite">{status}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('refresh')}
          disabled={view.status === 'loading'}
          onPress={() => refresh.mutate()}
          hitSlop={8}
        >
          <Icon name="RefreshCw" size={14} color={view.status === 'loading' ? c.foregroundMuted : c.foreground} />
        </Pressable>
      </View>
      {view.status === 'error' && view.error !== null && <Text style={s.error}>{m.status.error(view.error)}</Text>}
      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map(key => (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: key === open }} onPress={() => setOpen(key)} style={s.tab(key === open)}>
            <Text style={s.tabText(key === open)}>{label(key)}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView>
        {rows.length === 0 && view.fetchedAt !== null && <Text style={s.empty}>{m.empty[open]}</Text>}
        {rows.map(row => {
          const sub = [`${row.repo}#${row.number}`, row.author, tag(open, row)].filter(Boolean).join(' · ')
          return (
            <Pressable key={row.key} accessibilityRole="link" accessibilityLabel={`${row.title}, ${sub}`} onPress={() => void openExternalUrl(row.url)} style={s.row}>
              <Text style={s.title} numberOfLines={2}>{row.title}</Text>
              {row.summary !== null && <Text style={s.summary} numberOfLines={3}>{row.summary}</Text>}
              <Text style={s.sub} numberOfLines={1}>{sub}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

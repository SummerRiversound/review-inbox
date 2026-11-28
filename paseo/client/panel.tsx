import type { PluginTheme } from '@getpaseo/plugin'
import { openExternalUrl, type PluginScreenProps, type PluginWorkspacePanelProps, useComposers, useTabState } from '@getpaseo/plugin/client'
import { Icon, Loading, useToast } from '@getpaseo/plugin/client/ui'
import { type ReactNode, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import type { Messages } from '../shared/i18n'
import { severityCounts } from '../shared/autoreview'
import { ageColor, itemKey, reviewPrompt, waitingDays } from '../shared/inbox'
import { atLeast, issueHide, prHide, REFERENCE_DAYS, reviewers, stateColor, taskOf, taskPrompts, workWhere } from '../shared/tabs'
import type { AutoState, InboxItem, IssueItem, MyPr } from '../shared/types'
import { cardKey, reviewGroups, workGroups } from '../shared/view'
import { useHide, useInbox, useRefresh } from './inbox'
import { useMessages } from './messages'

const TABS = ['review', 'work'] as const
const tabState = z.object({ tab: z.enum(TABS), open: z.array(z.string()) })
type TabState = z.infer<typeof tabState>
const START: TabState = { tab: 'review', open: [] }

type Tone = 'error' | 'warning' | 'success' | 'suggestion' | 'subtle' | 'inactive'
const toneColor = (c: PluginTheme['colors'], tone: Tone) =>
  tone === 'error' ? c.statusDanger : tone === 'warning' ? c.statusWarning : tone === 'success' ? c.statusSuccess : tone === 'suggestion' ? c.accent : c.foregroundMuted

const styles = (c: PluginTheme['colors'], compact: boolean) => {
  const pad = compact ? 12 : 16
  return {
    screen: { flex: 1, backgroundColor: c.surface0 },
    head: { paddingHorizontal: pad, paddingTop: 12, paddingBottom: 8 },
    headRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    status: { flex: 1, color: c.foregroundMuted, fontSize: 12 },
    error: { color: c.statusDanger, fontSize: 12, marginTop: 4 },
    seg: { flexDirection: 'row' as const, gap: 6, paddingHorizontal: pad, paddingBottom: 10 },
    segItem: (on: boolean) => ({ flex: 1, minHeight: compact ? 44 : 32, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: on ? c.surface2 : 'transparent' }),
    segText: (on: boolean) => ({ color: on ? c.foreground : c.foregroundMuted, fontSize: 13, fontWeight: on ? ('600' as const) : ('400' as const) }),
    group: { marginHorizontal: pad, marginBottom: 10, borderWidth: 1, borderColor: c.border, borderRadius: 10, backgroundColor: c.surface1, overflow: 'hidden' as const },
    groupHead: { color: c.foregroundMuted, fontSize: 12, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
    row: (open: boolean, first: boolean) => ({ paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.border, backgroundColor: open ? c.surface2 : 'transparent' }),
    top: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 8, alignItems: 'center' as const },
    where: { flexShrink: 1, color: c.foregroundMuted, fontSize: 12 },
    right: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2 },
    tag: (color: string, strong: boolean) => ({ color, fontSize: 12, fontWeight: strong ? ('600' as const) : ('400' as const) }),
    name: { color: c.foreground, fontSize: 13, fontWeight: '600' as const, marginTop: 2 },
    line: { color: c.foreground, fontSize: 13, marginTop: 2 },
    label: { color: c.foregroundMuted, fontSize: 12, marginTop: 8 },
    warn: { color: c.statusWarning, fontSize: 13 },
    metaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 8 },
    meta: { flex: 1, color: c.foregroundMuted, fontSize: 12 },
    auto: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 6 },
    dot: (color: string) => ({ width: 8, height: 8, borderRadius: 4, backgroundColor: color }),
    autoText: { flex: 1, color: c.foregroundMuted, fontSize: 12 },
    buttons: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 6, marginTop: 10 },
    buttonGroup: { flex: 1, flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    button: (main: boolean) => ({ minHeight: compact ? 44 : 32, minWidth: compact ? 44 : 32, paddingHorizontal: 10, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 8, borderWidth: 1, borderColor: main ? c.accent : c.border, backgroundColor: main ? c.accent : c.surface0 }),
    buttonText: (main: boolean) => ({ color: main ? c.accentForeground : c.foreground, fontSize: 12, fontWeight: main ? ('600' as const) : ('400' as const) }),
    empty: { color: c.foregroundMuted, fontSize: 13, paddingHorizontal: pad, paddingVertical: 12 },
    more: { color: c.foregroundMuted, fontSize: 12, paddingHorizontal: pad, paddingVertical: 8, minHeight: compact ? 44 : 0 },
  }
}
type Styles = ReturnType<typeof styles>

// The auto-review line of a review card, as the mod words it; nothing for a card auto review leaves alone.
function autoLine(state: AutoState | undefined, m: Messages, now: number): { text: string; tone: Tone } | undefined {
  if (state === undefined) return undefined
  switch (state.kind) {
    case 'running':
      return { text: m.auto.running(Math.max(0, Math.floor((now - state.since) / 60_000))), tone: 'warning' }
    case 'done':
      if (!state.result) return { text: m.auto.pending, tone: 'subtle' }
      // The mod's line: the verdict it suggests, the findings by severity, and the tokens it took.
      const counts = severityCounts(state.result.findings).map(c => `${c.count} ${m.auto.severities[c.severity]}`)
      const head = [m.auto.suggests(m.auto.verdicts[state.result.verdict]), counts.length > 0 ? counts.join(', ') : m.auto.noFindings, state.tokens ? m.auto.tokens(Math.round(state.tokens / 1000)) : '']
      return { text: head.filter(Boolean).join(' · '), tone: 'suggestion' }
    case 'stale':
      return { text: m.auto.pending, tone: 'subtle' }
    case 'failed':
      return { text: m.auto.failed(state.error), tone: 'error' }
    case 'capped':
      return { text: m.auto.capped, tone: 'subtle' }
    case 'queued':
      return { text: m.auto.queued(state.ahead), tone: 'subtle' }
    case 'settling':
      return { text: m.auto.settling(Math.max(1, Math.ceil((state.startsAt - now) / 60_000))), tone: 'subtle' }
    case 'manual':
      return { text: state.why === 'before' ? m.auto.before : m.auto.tooBig, tone: 'subtle' }
  }
}

function Button({ s, label, main = false, icon, onPress, color }: { s: Styles; label: string; main?: boolean; icon?: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.button(main)}>
      {icon ? <Icon name={icon} size={14} color={color} /> : <Text style={s.buttonText(main)}>{label}</Text>}
    </Pressable>
  )
}

// One card: its top line, name and first line always; the rest only while it is open.
function Row({ s, c, first, open, onToggle, where, tag, tagColor, strong, name, line, children, label }: {
  s: Styles; c: PluginTheme['colors']; first: boolean; open: boolean; onToggle: () => void; where: string; tag: string; tagColor: string; strong: boolean; name: string; line?: string; children: ReactNode; label: string
}) {
  return (
    <View style={s.row(open, first)}>
      <Pressable accessibilityRole="button" aria-expanded={open} accessibilityLabel={label} onPress={onToggle}>
        <View style={s.top}>
          <Text style={s.where} numberOfLines={1}>{where}</Text>
          <View style={s.right}>
            <Text style={s.tag(tagColor, strong)}>{tag}</Text>
            <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} color={c.foregroundMuted} />
          </View>
        </View>
        <Text style={s.name} numberOfLines={open ? undefined : 2}>{name}</Text>
        {line ? <Text style={s.line} numberOfLines={open ? undefined : 1}>{line}</Text> : null}
      </Pressable>
      {open ? children : null}
    </View>
  )
}

function Group({ s, title, children }: { s: Styles; title: string; children: ReactNode[] }) {
  if (children.length === 0) return null
  return (
    <View style={s.group}>
      <Text style={s.groupHead} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  )
}

// The inbox as one surface: the Explorer panel keeps what is open in its tab, the full screen for as long as it is shown.
function Inbox({ theme, layout, state, setState }: { theme: PluginTheme; layout: { compact: boolean }; state: TabState; setState: (next: TabState) => void }) {
  const { m, t } = useMessages()
  const q = useInbox()
  const refresh = useRefresh()
  const hide = useHide()
  const toast = useToast()
  const [composer] = useComposers({ focused: true })
  const c = theme.colors
  const s = useMemo(() => styles(c, layout.compact), [c, layout.compact])

  if (q.isPending) return <Loading />
  const view = q.data
  if (view === undefined) return <Text style={s.empty}>{m.status.error(q.error instanceof Error ? q.error.message : String(q.error))}</Text>

  const now = Date.now()
  const isOpen = (key: string) => state.open.includes(key)
  const toggle = (key: string) => setState({ ...state, open: isOpen(key) ? state.open.filter(k => k !== key) : [...state.open, key] })
  // Into the prompt of the agent on screen, as the mod fills the prompt; the person sends it.
  const fill = (add: (draft: string) => string) => {
    if (composer === undefined) return toast.show(t('noAgent'))
    composer.setPrompt(composer.prompt + add(composer.prompt))
    void composer.focus().catch(() => undefined)
    toast.show(m.command.filled)
  }
  const here = { kind: 'here' as const }

  const review = reviewGroups(view)
  const work = workGroups(view)
  const reviewCount = review.direct.length + review.team.length
  const workCount = work.prs.length + work.issues.length + work.references.length
  const running = Object.values(view.auto).filter(a => a.kind === 'running').length
  const updated = view.fetchedAt === null ? m.status.firstFetch : view.status === 'loading' ? m.status.loading : m.status.updated(Math.floor((now - view.fetchedAt) / 60_000))

  const reviewRow = (item: InboxItem, first: boolean) => {
    const key = cardKey(item)
    const days = waitingDays(item.requestedAt, now)
    const auto = autoLine(view.auto[key], m, now)
    const done = view.auto[key]
    const reviewId = done?.kind === 'done' || done?.kind === 'stale' ? done.reviewId : undefined
    const since = item.sinceLastReview ? `${m.card.sinceMyReview}: ${item.sinceLastReview}` : undefined
    const where = [`${item.repo} #${item.number}`, item.isRerequest ? m.card.rerequest : '', item.team ?? ''].filter(Boolean).join(' · ')
    return (
      <Row key={key} s={s} c={c} first={first} open={isOpen(key)} onToggle={() => toggle(key)} label={`${item.title}, ${where}, ${m.card.waiting(days)}`}
        where={where} tag={m.card.waiting(days)} tagColor={item.isDraft || days < 3 ? c.foregroundMuted : toneColor(c, ageColor(days))} strong={days >= 3}
        name={item.title} line={since ?? (item.summary !== item.title ? item.summary : undefined)}>
        {since ? <><Text style={s.label}>{m.card.summary}</Text><Text style={s.line}>{item.summary}</Text></> : null}
        {item.why ? <><Text style={s.label}>{m.card.why}</Text><Text style={s.line}>{item.why}</Text></> : null}
        {item.impact.length > 0 ? <Text style={s.label}>{m.card.impact}</Text> : null}
        {item.impact.map(i => <Text key={i.text} style={i.warn ? s.warn : s.line}>{i.warn ? '⚠ ' : '· '}{i.text}</Text>)}
        <View style={s.metaRow}>
          <Text style={s.meta}>{`${item.author} · ${m.card.size(item.files, `${item.additions}`, `${item.deletions}`)}`}</Text>
          <Button s={s} label={t('github')} icon="ExternalLink" color={c.foreground} onPress={() => void openExternalUrl(item.url)} />
        </View>
        {auto ? <View style={s.auto}><View style={s.dot(toneColor(c, auto.tone))} /><Text style={s.autoText}>{auto.text}</Text></View> : null}
        <View style={s.buttons}><View style={s.buttonGroup}>
          <Button s={s} main label={m.card.review} onPress={() => fill(d => reviewPrompt(d, item, m, reviewId === undefined ? undefined : { id: reviewId, where: workWhere(here, item.repo, true, m) }))} />
          {reviewId !== undefined ? <Button s={s} label={t('pending')} onPress={() => void openExternalUrl(`${item.url}/files`)} /> : null}
          <Button s={s} label={m.card.hide} onPress={() => hide.mutate({ key: itemKey(item), value: item.headSha })} />
        </View></View>
      </Row>
    )
  }

  const prRow = (pr: MyPr, first: boolean) => {
    const key = cardKey(pr)
    const task = taskOf(pr)
    const who = reviewers(pr)
    const tag = `${m.state[pr.state]} · ${m.card.waiting(waitingDays(pr.createdAt, now))}`
    return (
      <Row key={key} s={s} c={c} first={first} open={isOpen(key)} onToggle={() => toggle(key)} label={`${pr.title}, ${pr.repo} #${pr.number}, ${tag}`}
        where={`${pr.repo} #${pr.number}`} tag={tag} tagColor={toneColor(c, stateColor(pr.state))} strong={pr.state !== 'waiting'}
        name={pr.title} line={who ? m.card.newReview(who) : pr.ciPending ? m.card.ciRunning.replace(/^ · /, '') : undefined}>
        <View style={s.buttons}>
          <View style={s.buttonGroup}>
            {task ? <Button s={s} main label={m.card.task[task]} onPress={() => fill(d => taskPrompts(d, [{ task: { kind: task, repo: pr.repo, url: pr.url, ...(pr.base ? { base: pr.base } : {}) }, place: here }], m))} /> : null}
            <Button s={s} label={m.card.hide} onPress={() => { const [k, v] = prHide(pr, now); hide.mutate({ key: k, value: v }) }} />
          </View>
          <Button s={s} label={t('github')} icon="ExternalLink" color={c.foreground} onPress={() => void openExternalUrl(pr.url)} />
        </View>
      </Row>
    )
  }

  const issueRow = (issue: IssueItem, first: boolean) => {
    const key = cardKey(issue)
    const task = taskOf(issue)
    const tag = `${m.issueKind[issue.kind]} · ${m.card.ago(waitingDays(issue.at, now))}`
    return (
      <Row key={key} s={s} c={c} first={first} open={isOpen(key)} onToggle={() => toggle(key)} label={`${issue.title}, ${issue.repo} #${issue.number}, ${tag}`}
        where={`${issue.repo} #${issue.number}`} tag={tag} tagColor={c.foregroundMuted} strong={false}
        name={issue.title} line={issue.by && issue.target ? m.card.referenced(issue.by, issue.target) : undefined}>
        <View style={s.buttons}>
          <View style={s.buttonGroup}>
            {task ? <Button s={s} main label={m.card.task[task]} onPress={() => fill(d => taskPrompts(d, [{ task: { kind: task, repo: issue.repo, url: issue.url }, place: here }], m))} /> : null}
            <Button s={s} label={m.card.hide} onPress={() => { const [k, v] = issueHide(issue); hide.mutate({ key: k, value: v }) }} />
          </View>
          <Button s={s} label={t('github')} icon="ExternalLink" color={c.foreground} onPress={() => void openExternalUrl(issue.url)} />
        </View>
      </Row>
    )
  }

  const hiddenCount = state.tab === 'review' ? review.hidden : work.hidden
  return (
    <View style={s.screen}>
      <View style={s.head}>
        <View style={s.headRow}>
          <Text style={s.status} accessibilityLiveRegion="polite">{running > 0 ? `${updated} · ${t('autoRunning')}` : updated}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('refresh')} disabled={view.status === 'loading'} onPress={() => refresh.mutate()} hitSlop={12}>
            <Icon name="RefreshCw" size={14} color={view.status === 'loading' ? c.foregroundMuted : c.foreground} />
          </Pressable>
        </View>
        {view.status === 'error' && view.error !== null ? <Text style={s.error}>{m.status.error(view.error)}</Text> : null}
      </View>
      <View style={s.seg} accessibilityRole="tablist">
        {TABS.map(tab => {
          const on = state.tab === tab
          const label = tab === 'review' ? m.tabs.review(atLeast(reviewCount, view.capped.review === true)) : m.tabs.work(atLeast(workCount, view.capped.mine === true || view.capped.issues === true))
          return (
            <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setState({ ...state, tab })} style={s.segItem(on)}>
              <Text style={s.segText(on)}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
      <ScrollView>
        {state.tab === 'review' ? (
          <>
            <Group s={s} title={m.sections.direct(review.direct.length)}>{review.direct.map((i, n) => reviewRow(i, n === 0))}</Group>
            <Group s={s} title={m.sections.team(review.team.length)}>{review.team.map((i, n) => reviewRow(i, n === 0))}</Group>
            <Group s={s} title={m.sections.drafts(review.drafts.length)}>{review.drafts.map((i, n) => reviewRow(i, n === 0))}</Group>
            {view.fetchedAt !== null && review.direct.length + review.team.length + review.drafts.length === 0 ? <Text style={s.empty}>{m.empty.review}</Text> : null}
          </>
        ) : (
          <>
            <Group s={s} title={m.tabs.mine(`${work.prs.length}`)}>{work.prs.map((pr, n) => prRow(pr, n === 0))}</Group>
            <Group s={s} title={m.tabs.issues(`${work.issues.length}`)}>{work.issues.map((i, n) => issueRow(i, n === 0))}</Group>
            <Group s={s} title={m.sections.references(REFERENCE_DAYS, work.references.length)}>{work.references.map((i, n) => issueRow(i, n === 0))}</Group>
            {view.fetchedAt !== null && workCount === 0 ? <Text style={s.empty}>{m.empty.mine}</Text> : null}
          </>
        )}
        {hiddenCount > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => hide.mutate({})}>
            <Text style={s.more}>{m.sections.hidden(hiddenCount)}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  )
}

export function InboxPanel({ theme, layout, tab }: PluginWorkspacePanelProps) {
  const [state, setState] = useTabState(tab, tabState, START)
  return <Inbox theme={theme} layout={layout} state={state} setState={setState} />
}

export function InboxScreen({ theme, layout }: PluginScreenProps) {
  const [state, setState] = useState<TabState>(START)
  return <Inbox theme={theme} layout={layout} state={state} setState={setState} />
}

import type { Gh, Summarizer } from '../shared/fetch'
import { MESSAGES, type Language } from '../shared/i18n'
import { failedSummary, parseSummary, sincePrompt, sinceRules, summaryPrompt, summaryRules } from '../shared/inbox'
import type { Ask } from './ask'

// The mod's summaries, asked through `ask` instead of the session's model.
export const summarizer = (ask: Ask, gh: Gh, env: Record<string, string>, language: Language): Summarizer => ({
  summary: async (hit, detail, prev) => {
    const text = await ask(summaryRules(language), summaryPrompt(hit, detail))
    const parsed = text === null ? undefined : parseSummary(text)
    return parsed ?? failedSummary(hit.title, text === null ? 'no answer' : 'unreadable reply', prev, detail.headRefOid, MESSAGES[language])
  },
  // A failed comparison (a force-push rewrote the reviewed commit) just leaves the line out.
  since: async (repo, from, to) => {
    try {
      const diff = JSON.parse(
        await gh(['api', `repos/${repo}/compare/${from}...${to}`, '--jq', '{commits: [.commits[].commit.message], files: [.files[].filename]}'], env),
      ) as { commits: string[]; files: string[] }
      return (await ask(sinceRules(language), sincePrompt(diff.commits, diff.files)))?.trim() || undefined
    } catch {
      return undefined
    }
  },
})

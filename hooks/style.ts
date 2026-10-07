import { MESSAGES } from './i18n'
import type { Language } from './i18n'

// PRs I reviewed and did not write, newest first; only my own reviews are kept, cut short, to stay far below gh's output cap.
export const STYLE_QUERY = `query($q: String!) {
  viewer { login }
  search(query: $q, type: ISSUE, first: 30) {
    nodes { ... on PullRequest { reviews(last: 20) { nodes { author { login } body comments(first: 20) { nodes { body } } } } } }
  }
}`
export const STYLE_JQ =
  '.data | .viewer.login as $me | .search.nodes |= map(if .reviews then .reviews.nodes |= map(select(.author.login == $me) | .body |= .[:500] | .comments.nodes |= map(.body |= .[:500])) else . end)'

export function styleQuery(scope: string): string {
  return ['is:pr reviewed-by:@me -author:@me sort:updated-desc', scope.trim()].filter(Boolean).join(' ')
}

export type GqlReviewed = {
  reviews: { nodes: { author: { login: string } | null; body: string; comments: { nodes: { body: string }[] } }[] }
}

const SAMPLE_CHARS = 500
const MAX_SAMPLES = 60
const MAX_SAMPLE_TOTAL = 12_000

// My review bodies and inline comments, newest PRs first, capped so one long thread can't crowd out the rest.
export function styleSamples(nodes: Partial<GqlReviewed>[], me: string): string[] {
  const samples: string[] = []
  let total = 0
  for (const pr of nodes) {
    for (const review of pr.reviews?.nodes ?? []) {
      if (review.author?.login.toLowerCase() !== me.toLowerCase()) continue
      for (const body of [review.body, ...(review.comments?.nodes ?? []).map(c => c.body)]) {
        const text = (body ?? '').trim().slice(0, SAMPLE_CHARS)
        if (!text) continue
        if (samples.length >= MAX_SAMPLES || total + text.length > MAX_SAMPLE_TOTAL) return samples
        samples.push(text)
        total += text.length
      }
    }
  }
  return samples
}

// Fewer recent reviews than this say too little about how I write; the prompt then goes without a style line.
export const MIN_STYLE_SAMPLES = 5

export function stylePrompt(samples: string[]): string | undefined {
  if (samples.length < MIN_STYLE_SAMPLES) return undefined
  return `Past review comments, newest first:\n\n${samples.map(s => `---\n${s}`).join('\n')}`
}

export const STYLE_MS = 7 * 86_400_000
export const STYLE_RETRY_MS = 86_400_000
const MAX_STYLE_CHARS = 600

// Shared by every session like the inbox: the learned style, when it was last learned, and when to retry after a failure.
export type StyleFile = { profile?: string; checkedAt?: number; samples?: number; retryAt?: number }

export function shouldBuildStyle(file: StyleFile, now: number): boolean {
  if (file.retryAt !== undefined) return now >= file.retryAt
  return file.checkedAt === undefined || now - file.checkedAt >= STYLE_MS
}

export function styleRules(language: Language): string {
  return `You describe how one person writes code reviews, so an assistant can review a pull request the way they would.
${MESSAGES[language].model.style}

Read their past review comments and reply with two to four short sentences in one paragraph, covering:
- the language and tone they review in, such as short and direct or polite questions
- what they usually look at first
- how they phrase requests, and how long their comments are
Describe the style; do not give advice. No quotes, names, repository names, code, file paths or issue numbers.
Reply with the paragraph only.`
}

export function parseStyle(text: string): string | undefined {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_STYLE_CHARS) || undefined
}

// Every search reads GitHub a page at a time, so no single request grows with the account:
// GitHub gives up on a query after about 10 s, however many nodes it was asked for.
export const PAGE_SIZE = 25
// A page that times out is asked again at half the size, down to this.
export const MIN_PAGE = 5
// One tab's search reads at most this many; past it, its count reads as at least that many.
export const SEARCH_LIMIT = 100

export type Page<T> = {
  viewer?: { login: string }
  search: { pageInfo: { hasNextPage: boolean; endCursor?: string | null }; nodes: Partial<T>[] }
}

// Each paged query takes these two variables and asks `pageInfo { hasNextPage endCursor }`.
export const PAGE_ARGS = '$first: Int!, $after: String'
export const PAGE = 'first: $first, after: $after'

// GitHub's timeout comes back as an HTML error page that gh cannot parse.
export const isGatewayTimeout = (message: string) => /HTTP 50[234]|invalid character '<'/.test(message)

export const smallerPage = (size: number) => (size > MIN_PAGE ? Math.max(MIN_PAGE, Math.floor(size / 2)) : undefined)

// Pages until GitHub has no more or `limit` nodes are read; `capped` says there were more.
export async function readPages<T>(
  fetchPage: (first: number, after?: string) => Promise<Page<T>>,
  limit: number,
): Promise<{ login?: string; nodes: Partial<T>[]; capped: boolean }> {
  const nodes: Partial<T>[] = []
  let size = PAGE_SIZE
  let after: string | undefined
  let login: string | undefined
  for (;;) {
    let page: Page<T>
    try {
      page = await fetchPage(Math.min(size, limit - nodes.length), after)
    } catch (error) {
      const smaller = isGatewayTimeout(error instanceof Error ? error.message : String(error)) ? smallerPage(size) : undefined
      if (smaller === undefined) throw error
      // The rest of this search keeps the smaller size: its nodes are the heavy ones.
      size = smaller
      continue
    }
    login ??= page.viewer?.login
    nodes.push(...page.search.nodes)
    const { hasNextPage, endCursor } = page.search.pageInfo
    if (!hasNextPage || !endCursor) return { login, nodes, capped: false }
    if (nodes.length >= limit) return { login, nodes, capped: true }
    after = endCursor
  }
}

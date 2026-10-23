import { expect, test } from 'claude-code/testing'

import { isGatewayTimeout, MIN_PAGE, PAGE_SIZE, readPages } from '../hooks/pages'
import type { Page } from '../hooks/pages'

type Node = { n: number }
const TIMEOUT = "invalid character '<' looking for beginning of value"

// A search of `total` nodes that times out whenever a page asks for more than `maxOk`.
function github(total: number, maxOk = Infinity) {
  const asked: number[] = []
  const fetchPage = async (first: number, after?: string): Promise<Page<Node>> => {
    asked.push(first)
    if (first > maxOk) throw new Error(TIMEOUT)
    const start = after ? Number(after) : 0
    const end = Math.min(total, start + first)
    const nodes = Array.from({ length: end - start }, (_, i) => ({ n: start + i }))
    return { viewer: { login: 'me' }, search: { pageInfo: { hasNextPage: end < total, endCursor: `${end}` }, nodes } }
  }
  return { asked, fetchPage }
}

test('a search is read a page at a time until GitHub has no more', async () => {
  const { asked, fetchPage } = github(60)
  const read = await readPages(fetchPage, 100)
  expect(read.nodes.map(node => node.n)).toEqual(Array.from({ length: 60 }, (_, i) => i))
  expect(read).toMatchObject({ login: 'me', capped: false })
  expect(asked).toEqual([PAGE_SIZE, PAGE_SIZE, PAGE_SIZE])
})

test('a search stops at its limit and says there were more', async () => {
  const { asked, fetchPage } = github(500)
  const read = await readPages(fetchPage, 30)
  expect(read.nodes).toHaveLength(30)
  expect(read.capped).toBe(true)
  expect(asked).toEqual([PAGE_SIZE, 5])
})

test('a page that times out is asked again at half the size, and the rest of the search keeps it', async () => {
  const { asked, fetchPage } = github(20, 6)
  const read = await readPages(fetchPage, 100)
  expect(read.nodes).toHaveLength(20)
  expect(asked).toEqual([25, 12, 6, 6, 6, 6])
})

test('a timeout at the smallest page, or any other failure, fails the search', async () => {
  await expect(readPages(github(20, MIN_PAGE - 1).fetchPage, 100)).rejects.toThrow(TIMEOUT)
  await expect(readPages(async () => Promise.reject(new Error('HTTP 401: Bad credentials')), 100)).rejects.toThrow('HTTP 401')
})

test('a GitHub gateway page reads as a timeout, other failures as themselves', () => {
  expect(isGatewayTimeout(TIMEOUT)).toBe(true)
  expect(isGatewayTimeout('HTTP 502: Bad Gateway (https://api.github.com/graphql)')).toBe(true)
  expect(isGatewayTimeout('HTTP 401: Bad credentials')).toBe(false)
})

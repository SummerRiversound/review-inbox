import { useRpc } from '@getpaseo/plugin/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hideRpc, inboxRpc, refreshRpc } from '../shared/rpc'

// The server writes each list as it arrives; a few seconds behind is close enough.
// shortcut: polling, not a subscription; push from the server if the delay shows.
const POLL_MS = 5000
const KEY = ['review-inbox', 'inbox'] as const

export const useInbox = () => {
  const read = useRpc(inboxRpc)
  return useQuery({ queryKey: KEY, queryFn: () => read({}), refetchInterval: POLL_MS })
}

export const useRefresh = () => {
  const refresh = useRpc(refreshRpc)
  const client = useQueryClient()
  return useMutation({ mutationFn: () => refresh({}), onSuccess: () => client.invalidateQueries({ queryKey: KEY }) })
}

// Hides one card, or with no key shows every hidden card again; the lists are read again at once.
export const useHide = () => {
  const hide = useRpc(hideRpc)
  const client = useQueryClient()
  return useMutation({ mutationFn: (input: { key?: string; value?: string }) => hide(input), onSuccess: () => client.invalidateQueries({ queryKey: KEY }) })
}

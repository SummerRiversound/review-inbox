import { useRpc } from '@getpaseo/plugin/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inboxRpc, refreshRpc } from '../shared/rpc'

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

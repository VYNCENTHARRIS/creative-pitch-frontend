import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../shared/api/ApiError'
import { getAppInfo, getHealth, getReadiness } from '../api/systemStatus'
import type { ConnectionState } from '../types/status'

const queryPolicy = {
  retry: false,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  networkMode: 'always',
} as const

export function useSystemStatus() {
  const health = useQuery({
    ...queryPolicy,
    queryKey: ['system-status', 'health'],
    queryFn: ({ signal }) => getHealth(signal),
  })
  const readiness = useQuery({
    ...queryPolicy,
    queryKey: ['system-status', 'ready'],
    queryFn: ({ signal }) => getReadiness(signal),
  })
  const info = useQuery({
    ...queryPolicy,
    queryKey: ['system-status', 'info'],
    queryFn: ({ signal }) => getAppInfo(signal),
  })
  const isChecking = health.isFetching || readiness.isFetching || info.isFetching
  let state: ConnectionState
  if (health.isFetching || readiness.isFetching) state = 'checking'
  else if (health.isError) state = 'api-unavailable'
  else if (readiness.isError) {
    state =
      readiness.error instanceof ApiError && readiness.error.code === 'database_unavailable'
        ? 'database-unavailable'
        : 'readiness-unavailable'
  } else state = 'ready'

  return {
    state,
    isChecking,
    info: info.isSuccess ? info.data : undefined,
    infoPending: info.isFetching,
    // Refetch all three so a recovery cannot leave old app information on screen.
    retry: () => Promise.all([health.refetch(), readiness.refetch(), info.refetch()]),
  }
}

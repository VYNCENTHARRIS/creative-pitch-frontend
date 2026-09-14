import { useMemo } from 'react'
import { useAuth, type IdentityScope } from '../auth'
import { createConceptApi } from './api'

export const conceptKeys = {
  mine: (scope: IdentityScope) => ['concepts', scope.userId, 'mine', scope.epoch] as const,
  detail: (scope: IdentityScope, id: string) =>
    ['concepts', scope.userId, 'detail', id, scope.epoch] as const,
}
export const privateQueryOptions = {
  retry: false,
  staleTime: 0,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  networkMode: 'always' as const,
}
export function useConceptApi() {
  const { access, scope } = useAuth()
  const api = useMemo(() => createConceptApi(access), [access])
  return { api, scope, meta: { private: true, owner: scope.userId, epoch: scope.epoch } }
}

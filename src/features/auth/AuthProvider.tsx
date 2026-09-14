import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react'
import { ApiError } from '../../shared/api/ApiError'
import { getCurrentUser } from './api'
import { AuthContext, type AccessStatus } from './context'
import { getBrowserSession, type SessionController } from './session'

export function AuthProvider({
  children,
  controller = getBrowserSession(),
}: PropsWithChildren<{ controller?: SessionController }>) {
  const session = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const queryClient = useQueryClient()
  const [issue, setIssue] = useState<{ epoch: number; status: number } | null>(null)
  const scope = useMemo(
    () => ({ userId: session.identityId ?? '', epoch: session.epoch }),
    [session.identityId, session.epoch],
  )
  const access = useMemo(() => controller.access(scope), [controller, scope])
  useEffect(() => controller.start(), [controller])
  useEffect(() => {
    const clear = () => {
      const current = controller.getSnapshot()
      const filters = {
        predicate: (query: { meta?: Record<string, unknown> }) =>
          query.meta?.private === true &&
          (!current.session ||
            query.meta.epoch !== current.epoch ||
            query.meta.owner !== current.identityId),
      }
      void queryClient.cancelQueries(filters)
      queryClient.removeQueries(filters)
      queryClient
        .getMutationCache()
        .getAll()
        .filter(filters.predicate)
        .forEach((mutation) => queryClient.getMutationCache().remove(mutation))
    }
    clear()
  }, [controller, queryClient, session.epoch, session.session?.user.id])
  const loadProfile = useMemo(
    () =>
      ({ signal }: { signal: AbortSignal }) =>
        getCurrentUser(scope.userId, access, signal),
    [scope.userId, access],
  )
  const profile = useQuery({
    queryKey: ['current-user', session.session?.user.id ?? '', scope.epoch],
    queryFn: loadProfile,
    enabled: !!session.session && session.phase === 'ready',
    meta: { private: !!session.session, owner: scope.userId, epoch: scope.epoch },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: 'always',
  })
  const problem =
    issue?.epoch === scope.epoch
      ? issue.status
      : profile.error instanceof ApiError
        ? profile.error.status
        : null
  let status: AccessStatus = 'checking-access'
  if (session.phase === 'checking') status = 'checking-session'
  else if (session.phase === 'unavailable') status = 'unavailable'
  else if (!session.session) status = 'signed-out'
  else if (problem === 401) status = 'reauthenticate'
  else if (problem === 403) status = 'denied'
  else if (profile.isError) status = 'unavailable'
  else if (profile.data?.id === session.session.user.id) status = 'authenticated'
  const suspend = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setIssue((previous) =>
          previous?.epoch === scope.epoch && previous.status === error.status
            ? previous
            : { epoch: scope.epoch, status: error.status! },
        )
      }
    },
    [scope.epoch],
  )

  return (
    <AuthContext.Provider
      value={{
        status,
        profile: status === 'authenticated' ? profile.data : undefined,
        scope,
        access,
        controller,
        suspend,
        retryAccess: async () => {
          await controller.retrySession()
          await profile.refetch()
          if (controller.isCurrent(scope)) setIssue(null)
        },
        signOut: () => controller.signOut(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

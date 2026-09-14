import { createContext, useContext } from 'react'
import type { RequestAccess } from '../../shared/api/client'
import type { CurrentUser } from './api'
import type { IdentityScope, SessionController } from './session'

export type AccessStatus =
  | 'checking-session'
  | 'signed-out'
  | 'checking-access'
  | 'authenticated'
  | 'denied'
  | 'unavailable'
  | 'reauthenticate'
export interface AuthContextValue {
  status: AccessStatus
  profile: CurrentUser | undefined
  scope: IdentityScope
  access: RequestAccess
  controller: SessionController
  retryAccess: () => Promise<void>
  suspend: (error: unknown) => void
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}

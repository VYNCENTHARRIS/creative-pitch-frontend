import { createContext, useContext, useEffect } from 'react'

export interface LeaveCheck {
  dirty: () => boolean
  allows: (path: string) => boolean
}
export const NavigationContext = createContext<{
  register: (check: LeaveCheck) => () => void
  confirmAction: (action: () => void) => void
} | null>(null)
export function useNavigationGuard() {
  const value = useContext(NavigationContext)
  if (!value) throw new Error('NavigationGuard is required')
  return value
}
export function useUnsavedWork(check: LeaveCheck, needed: boolean) {
  const { register } = useNavigationGuard()
  useEffect(() => register(check), [check, register, needed])
}

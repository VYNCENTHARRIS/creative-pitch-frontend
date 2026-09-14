import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { AccessPanel, safeReturnPath, useAuth } from '../features/auth'

export function RequireAccess() {
  const auth = useAuth()
  const location = useLocation()
  const [admitted, setAdmitted] = useState<{ epoch: number; location: string } | null>(null)
  if (
    auth.status === 'authenticated' &&
    (admitted?.epoch !== auth.scope.epoch || admitted.location !== location.key)
  ) {
    setAdmitted({ epoch: auth.scope.epoch, location: location.key })
  }
  const retainingEditor =
    admitted?.epoch === auth.scope.epoch &&
    admitted.location === location.key &&
    /^\/concepts\/[^/]+$/.test(location.pathname)
  if (auth.status === 'authenticated' || retainingEditor) return <Outlet key={auth.scope.epoch} />
  if (auth.status === 'signed-out')
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(safeReturnPath(location.pathname))}`}
        replace
      />
    )
  return <AccessPanel />
}

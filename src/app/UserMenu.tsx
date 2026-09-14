import { Alert, Button, Menu, Text } from '@mantine/core'
import { IconChevronDown, IconLogout } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../features/auth'
import { useNavigationGuard } from '../shared/ui/navigationContext'

export function UserMenu() {
  const auth = useAuth()
  const guard = useNavigationGuard()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  if (!auth.scope.userId)
    return (
      <Button component={Link} to="/login" variant="light" size="sm">
        Sign in
      </Button>
    )
  function signOut() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    void auth
      .signOut()
      .catch(() =>
        setError(
          'Sign out could not be confirmed. Your session may still be active. Please retry.',
        ),
      )
      .finally(() => {
        pending.current = false
        setBusy(false)
      })
  }
  return (
    <div>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button
            variant="subtle"
            size="sm"
            maw={240}
            loading={busy}
            rightSection={<IconChevronDown size={16} aria-hidden="true" />}
            aria-label="Account menu"
          >
            <Text truncate>{auth.profile?.display_name ?? 'Account access'}</Text>
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {auth.profile && (
            <Menu.Label>{auth.profile.role === 'admin' ? 'Admin' : 'Writer'}</Menu.Label>
          )}
          <Menu.Item
            leftSection={<IconLogout size={16} aria-hidden="true" />}
            onClick={() => guard.confirmAction(signOut)}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      {error && (
        <Alert color="red" role="alert" maw={320}>
          {error}
        </Alert>
      )}
    </div>
  )
}

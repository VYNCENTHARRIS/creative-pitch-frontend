import { Alert, Button, Stack, Text, Title } from '@mantine/core'
import { useAuth } from './context'
import { LoginForm } from './LoginForm'

export function AccessPanel({
  recovery = false,
  expectedEmail,
}: {
  recovery?: boolean
  expectedEmail?: string
}) {
  const auth = useAuth()
  if (auth.status === 'checking-session' || auth.status === 'checking-access')
    return (
      <Text role="status">
        {auth.status === 'checking-session' ? 'Checking session…' : 'Checking application access…'}
      </Text>
    )
  if (auth.status === 'authenticated') return null
  const login = auth.status === 'signed-out' || auth.status === 'reauthenticate'
  return (
    <Stack maw={480} mx="auto" py="lg">
      <Title order={recovery ? 2 : 1} c="var(--heading)" size="h2">
        {login
          ? 'Sign in to continue'
          : auth.status === 'denied'
            ? 'Application access denied'
            : 'Service temporarily unavailable'}
      </Title>
      <Alert color={auth.status === 'denied' ? 'red' : 'blue'}>
        {recovery
          ? auth.status === 'denied'
            ? 'Your writing is retained in this tab, but your account does not have active access. Contact your administrator, then retry.'
            : 'Your writing is retained in this tab. Sign in with the same account to continue saving. To switch accounts, sign out first.'
          : auth.status === 'denied'
            ? 'Your account does not have active application access. Contact your administrator.'
            : 'Application access must be verified before opening your private workspace.'}
      </Alert>
      {login ? (
        <LoginForm reauthenticate={recovery} expectedEmail={expectedEmail} />
      ) : (
        <Button
          onClick={() => {
            void auth.retryAccess()
          }}
        >
          Retry application access
        </Button>
      )}
    </Stack>
  )
}

import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useRef, useState } from 'react'
import { isRecord } from '../../shared/lib/isRecord'
import { useAuth } from './context'

export function LoginForm({
  reauthenticate = false,
  expectedEmail,
}: {
  reauthenticate?: boolean
  expectedEmail?: string
}) {
  const auth = useAuth()
  const [email, setEmail] = useState(expectedEmail ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (inFlight.current) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
          setError('Enter a valid email address and your password.')
          return
        }
        if (expectedEmail && email.trim().toLowerCase() !== expectedEmail.toLowerCase()) {
          setError(
            'Use the same account to recover this writing. To switch accounts, sign out first.',
          )
          return
        }
        inFlight.current = true
        setBusy(true)
        setError('')
        void auth.controller
          .signIn(email.trim(), password)
          .then(async () => {
            setPassword('')
            await auth.retryAccess()
          })
          .catch((failure: unknown) => {
            setError(
              isRecord(failure) && failure.code === 'invalid_credentials'
                ? 'The email or password is incorrect.'
                : 'Sign-in is temporarily unavailable or could not be completed. Please try again.',
            )
          })
          .finally(() => {
            inFlight.current = false
            setBusy(false)
          })
      }}
      noValidate
    >
      <Stack>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <TextInput
          label="Email"
          type="email"
          size="md"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          disabled={busy}
        />
        <PasswordInput
          label="Password"
          size="md"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          disabled={busy}
        />
        <Button type="submit" loading={busy}>
          {reauthenticate ? 'Sign in again' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  )
}

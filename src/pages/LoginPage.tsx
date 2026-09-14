import { Paper, Stack, Text, Title } from '@mantine/core'
import { Navigate, useSearchParams } from 'react-router'
import { AccessPanel, LoginForm, safeReturnPath, useAuth } from '../features/auth'
import classes from './LoginPage.module.css'

export function LoginPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  if (auth.status === 'authenticated')
    return <Navigate to={safeReturnPath(params.get('returnTo'))} replace />
  return (
    <div className={classes.background}>
      <Paper className={classes.form} p={{ base: 'lg', sm: 'xl' }}>
        {auth.status === 'signed-out' ? (
          <Stack gap="lg">
            <div>
              <Title order={1} c="var(--heading)">
                Sign in to Creative Pitch
              </Title>
              <Text c="dimmed" mt="sm">
                A private space for your next concept.
              </Text>
            </div>
            <LoginForm />
          </Stack>
        ) : (
          <AccessPanel />
        )}
      </Paper>
    </div>
  )
}

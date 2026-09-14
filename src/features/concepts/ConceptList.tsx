import { Alert, Anchor, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { IconArrowRight, IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useEffect } from 'react'
import { apiErrorMessage } from '../../shared/api/client'
import { useAuth, AccessPanel } from '../auth'
import { conceptKeys, privateQueryOptions, useConceptApi } from './queries'
import classes from './Concepts.module.css'

export function ConceptList() {
  const auth = useAuth()
  const { api, scope, meta } = useConceptApi()
  const query = useQuery({
    ...privateQueryOptions,
    queryKey: conceptKeys.mine(scope),
    queryFn: api.mine,
    meta,
    enabled: auth.status === 'authenticated',
  })
  const { suspend } = auth
  useEffect(() => {
    suspend(query.error)
  }, [query.error, suspend])
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1} c="var(--heading)">
            My Concepts
          </Title>
          <Text c="dimmed" mt="xs">
            Your private working drafts.
          </Text>
        </div>
        <Button
          component={Link}
          to="/concepts/new"
          leftSection={<IconPlus size={18} aria-hidden="true" />}
        >
          New Concept
        </Button>
      </Group>
      {auth.status !== 'authenticated' ? (
        <AccessPanel />
      ) : query.isPending ? (
        <Text role="status">Loading your concepts…</Text>
      ) : query.isError ? (
        <Alert color="red" title="Could not load your concepts" role="alert">
          <Text>{apiErrorMessage(query.error)}</Text>
          <Button
            mt="md"
            variant="light"
            onClick={() => {
              auth.suspend(query.error)
              void query.refetch()
            }}
          >
            Retry
          </Button>
        </Alert>
      ) : query.data.length === 0 ? (
        <Paper p="xl" className={classes.surface}>
          <Stack align="flex-start">
            <Title order={2} size="h3">
              No concepts yet
            </Title>
            <Text c="dimmed">Start with a few words. You can save unfinished work.</Text>
            <Button component={Link} to="/concepts/new" variant="light">
              New Concept
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack component="ul" gap="sm" className={classes.list}>
          {query.data.map((concept) => (
            <Paper
              component="li"
              key={concept.id}
              p={{ base: 'md', sm: 'lg' }}
              className={classes.surface}
            >
              <Group justify="space-between" wrap="wrap">
                <div className={classes.summary}>
                  <Title order={2} size="h3">
                    {concept.title || 'Untitled concept'}
                  </Title>
                  {concept.category && (
                    <Text size="sm" mt={4}>
                      {concept.category}
                    </Text>
                  )}
                  <Text c="dimmed" size="sm" mt="xs">
                    Last saved{' '}
                    <time dateTime={concept.draft_updated_at}>
                      {new Date(concept.draft_updated_at).toLocaleString()}
                    </time>
                  </Text>
                </div>
                <Anchor
                  component={Link}
                  to={`/concepts/${concept.id}`}
                  className={classes.openLink}
                >
                  Open draft <IconArrowRight size={16} aria-hidden="true" />
                </Anchor>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

import {
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconCircleCheck,
  IconCloudOff,
  IconDatabase,
  IconExclamationCircle,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react'
import { useSystemStatus } from '../hooks/useSystemStatus'
import type { ConnectionState } from '../types/status'
import classes from './SystemStatus.module.css'

const states = {
  checking: {
    title: 'Checking connection',
    description: 'Contacting the backend and checking database readiness.',
    color: 'brand',
    Icon: IconRefresh,
  },
  'api-unavailable': {
    title: 'API unavailable',
    description: 'Unable to reach the backend. Check that it is running, then retry.',
    color: 'red',
    Icon: IconCloudOff,
  },
  'database-unavailable': {
    title: 'API connected — database unavailable',
    description: 'The database is unavailable.',
    color: 'yellow',
    Icon: IconExclamationCircle,
  },
  'readiness-unavailable': {
    title: 'API connected — readiness unconfirmed',
    description: 'The readiness check could not be completed. Please retry.',
    color: 'yellow',
    Icon: IconExclamationCircle,
  },
  ready: {
    title: 'Ready',
    description: 'Backend connected. Database ready.',
    color: 'brand',
    Icon: IconCircleCheck,
  },
} satisfies Record<
  ConnectionState,
  { title: string; description: string; color: string; Icon: typeof IconServer }
>

export function SystemStatus() {
  const { state, isChecking, info, infoPending, retry } = useSystemStatus()
  const { title, description, color, Icon } = states[state]
  const apiLabel =
    state === 'checking' ? 'Checking' : state === 'api-unavailable' ? 'Unavailable' : 'Connected'
  const databaseLabel =
    state === 'checking'
      ? 'Checking'
      : state === 'ready'
        ? 'Ready'
        : state === 'database-unavailable'
          ? 'Unavailable'
          : 'Unconfirmed'

  return (
    <Paper
      component="section"
      aria-labelledby="connection-title"
      p={{ base: 20, sm: 24 }}
      className={classes.panel}
    >
      <Group justify="space-between" gap="sm" mb="md" align="flex-start">
        <Group gap="sm">
          <Title order={2} id="connection-title" className={classes.title}>
            System connection
          </Title>
          <Badge variant="light" color="brand">
            Live
          </Badge>
        </Group>
        <Button
          variant="default"
          size="sm"
          h={40}
          leftSection={<IconRefresh size={16} aria-hidden="true" />}
          disabled={isChecking}
          onClick={() => void retry()}
        >
          Retry
        </Button>
      </Group>
      <div className={classes.content} role="status" aria-live="polite" aria-atomic="true">
        <Group wrap="nowrap" align="flex-start" gap="sm">
          <ThemeIcon variant="light" color={color} size={40} radius="md">
            {state === 'checking' ? <Loader size={20} /> : <Icon size={22} aria-hidden="true" />}
          </ThemeIcon>
          <div>
            <Text fw={650} mb={4}>
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </div>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" className={classes.services}>
          <Group justify="space-between" gap="xs" className={classes.service}>
            <Group gap="sm">
              <IconServer size={19} color="#64748B" aria-hidden="true" />
              <Text size="sm" fw={500}>
                Backend API
              </Text>
            </Group>
            <Text size="sm" fw={600}>
              {apiLabel}
            </Text>
          </Group>
          <Group justify="space-between" gap="xs" className={classes.service}>
            <Group gap="sm">
              <IconDatabase size={19} color="#64748B" aria-hidden="true" />
              <Text size="sm" fw={500}>
                Database
              </Text>
            </Group>
            <Text size="sm" fw={600}>
              {databaseLabel}
            </Text>
          </Group>
        </SimpleGrid>
      </div>
      <Divider my="md" color="var(--border)" />
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          {info
            ? `${info.app_name} · Environment: ${info.environment}`
            : infoPending
              ? 'Checking application information…'
              : 'Application information unavailable.'}
        </Text>
        <Text size="xs" c="dimmed">
          Checked on load or retry
        </Text>
      </Group>
    </Paper>
  )
}

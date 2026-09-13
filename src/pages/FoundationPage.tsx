import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconArrowRight,
  IconCircleCheck,
  IconCircleX,
  IconExclamationCircle,
  IconPhotoOff,
  IconPencil,
  IconTypography,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { SystemStatus } from '../features/system-status'
import classes from './FoundationPage.module.css'

const examples = [
  { label: 'Approved', color: '#2E7D32', background: '#EDF7ED', Icon: IconCircleCheck },
  { label: 'Needs Work', color: '#8A5100', background: '#FFF5E2', Icon: IconExclamationCircle },
  { label: 'Rejected', color: '#B42318', background: '#FFF0EE', Icon: IconCircleX },
  { label: 'No image submitted', color: '#475569', background: '#F1F5F9', Icon: IconPhotoOff },
]

export function FoundationPage({ showWritingCanvas }: { showWritingCanvas: boolean }) {
  const [previewMessage, setPreviewMessage] = useState('No product actions are connected.')
  return (
    <Stack gap={28}>
      <div className={classes.introduction} data-has-canvas={showWritingCanvas}>
        <header>
          <Text className={classes.eyebrow} mb={16}>
            Creative workspace
          </Text>
          <Title order={1} className={classes.title} mb={16}>
            Creative Pitch
          </Title>
          <Text c="dimmed" size="lg" lh={1.65} maw={520}>
            A workspace for creating, reviewing, and tracking content pitches.
          </Text>
        </header>
        {import.meta.env.DEV && showWritingCanvas && (
          <section className={classes.destination} aria-labelledby="canvas-entry-title">
            <Group gap="sm" mb="md">
              <ThemeIcon size={40} radius="md" className={classes.destinationIcon}>
                <IconPencil size={21} aria-hidden="true" />
              </ThemeIcon>
              <Text className={classes.developmentLabel}>Development only</Text>
            </Group>
            <Title order={2} id="canvas-entry-title" fz={23} fw={650} mb={6}>
              Try the writing canvas
            </Title>
            <Text size="sm" c="#D9EAF8" lh={1.6} mb="lg">
              Explore the editor using browser-only test snapshots.
            </Text>
            <Button
              component={Link}
              to="/spikes/writing-canvas"
              className={classes.destinationAction}
              size="sm"
              h={42}
              rightSection={<IconArrowRight size={16} aria-hidden="true" />}
            >
              Open writing canvas
            </Button>
          </section>
        )}
      </div>
      <SystemStatus />
      <section aria-labelledby="preview-title">
        <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
          <div>
            <Title order={2} id="preview-title" className={classes.sectionTitle} mb={6}>
              Design preview
            </Title>
            <Text size="sm" c="dimmed">
              Static interface examples. No stored pitches or review data.
            </Text>
          </div>
          <Badge color="gray" variant="outline">
            Local examples
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Paper p={{ base: 20, sm: 24 }} className={classes.previewCard}>
            <Group gap="sm" mb={16}>
              <ThemeIcon size={38} radius="md" className={classes.previewIcon}>
                <IconTypography size={20} aria-hidden="true" />
              </ThemeIcon>
              <Text size="xs" c="dimmed" fw={600}>
                Type & actions
              </Text>
            </Group>
            <Title order={3} fz={24} fw={600} mb={10}>
              Space for your next idea.
            </Title>
            <Text size="sm" c="dimmed" lh={1.7} mb={24}>
              Clear hierarchy, comfortable spacing, and a little room to think. A first look at the
              workspace’s visual language.
            </Text>
            <Group gap="sm">
              <Button
                rightSection={<IconArrowRight size={16} aria-hidden="true" />}
                onClick={() =>
                  setPreviewMessage('Primary action preview selected. Nothing was saved.')
                }
              >
                Primary action
              </Button>
              <Button
                variant="subtle"
                onClick={() =>
                  setPreviewMessage('Secondary action preview selected. Nothing was saved.')
                }
              >
                Secondary action
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt="md" role="status">
              {previewMessage}
            </Text>
          </Paper>
          <Paper p={{ base: 20, sm: 24 }} className={classes.previewCard}>
            <Group gap="sm" mb={16}>
              <ThemeIcon size={38} radius="md" className={classes.previewIcon}>
                <IconCircleCheck size={20} aria-hidden="true" />
              </ThemeIcon>
              <Text size="xs" c="dimmed" fw={600}>
                Status language
              </Text>
            </Group>
            <Title order={3} fz={19} fw={600} mb={10}>
              A clear signal at every step.
            </Title>
            <Text size="sm" c="dimmed" lh={1.7} mb={24}>
              Text and icons give every status a meaning. Color adds emphasis.
            </Text>
            <Group gap={10}>
              {examples.map(({ label, color, background, Icon }) => (
                <span className={classes.statusExample} style={{ color, background }} key={label}>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </Group>
          </Paper>
        </SimpleGrid>
      </section>
      <Text component="footer" size="xs" c="dimmed">
        Foundation preview · Authentication and pitch workflows are not connected yet.
      </Text>
    </Stack>
  )
}

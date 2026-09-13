import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import {
  IconArrowRight,
  IconCircleCheck,
  IconCircleX,
  IconExclamationCircle,
  IconPhotoOff,
} from '@tabler/icons-react'
import { useState } from 'react'
import { SystemStatus } from '../features/system-status'

const examples = [
  { label: 'Approved', color: '#2E7D32', background: '#EDF7ED', Icon: IconCircleCheck },
  { label: 'Needs Work', color: '#8A5100', background: '#FFF5E2', Icon: IconExclamationCircle },
  { label: 'Rejected', color: '#B42318', background: '#FFF0EE', Icon: IconCircleX },
  { label: 'No image submitted', color: '#475569', background: '#F1F5F9', Icon: IconPhotoOff },
]

export function FoundationPage() {
  const [previewMessage, setPreviewMessage] = useState('No product actions are connected.')
  return (
    <Stack gap={36}>
      <header>
        <Text className="eyebrow" mb={12}>
          Workspace foundation
        </Text>
        <Title order={1} className="page-title" mb={16}>
          Creative Pitch
        </Title>
        <Text c="dimmed" size="lg" maw={610}>
          A workspace for creating, reviewing, and tracking content pitches.
        </Text>
      </header>
      <SystemStatus />
      <section aria-labelledby="preview-title">
        <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
          <div>
            <Title order={2} id="preview-title" className="section-title" mb={6}>
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
          <Paper p={{ base: 22, sm: 28 }} className="preview-card">
            <Text className="eyebrow" mb={14}>
              Type & actions
            </Text>
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
          <Paper p={{ base: 22, sm: 28 }}>
            <Text className="eyebrow" mb={14}>
              Status language
            </Text>
            <Title order={3} fz={19} fw={600} mb={10}>
              A clear signal at every step.
            </Title>
            <Text size="sm" c="dimmed" lh={1.7} mb={24}>
              Text and icons give every status a meaning. Color adds emphasis.
            </Text>
            <Group gap={10}>
              {examples.map(({ label, color, background, Icon }) => (
                <span className="status-example" style={{ color, background }} key={label}>
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

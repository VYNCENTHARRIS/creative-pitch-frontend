import { Button, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <Stack align="flex-start" gap="lg" py="xl">
      <Text className="eyebrow">404</Text>
      <Title order={1}>Page not found</Title>
      <Text c="dimmed">This page does not exist. Return to the Creative Pitch overview.</Text>
      <Button component={Link} to="/" leftSection={<IconArrowLeft size={18} aria-hidden="true" />}>
        Back to overview
      </Button>
    </Stack>
  )
}

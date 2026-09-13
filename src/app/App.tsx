import {
  ActionIcon,
  Anchor,
  AppShell,
  Badge,
  Container,
  Drawer,
  Group,
  NavLink,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconLayoutDashboard, IconMenu2, IconPencil } from '@tabler/icons-react'
import { Link, useLocation } from 'react-router'
import { AppRoutes } from './router'

export function App() {
  const [opened, { open, close }] = useDisclosure(false)
  const { pathname } = useLocation()
  const overview = (
    <NavLink
      component={Link}
      to="/"
      label="Overview"
      active={pathname === '/'}
      aria-current={pathname === '/' ? 'page' : undefined}
      leftSection={<IconLayoutDashboard size={18} aria-hidden="true" />}
      onClick={close}
    />
  )

  return (
    <AppShell header={{ height: 76 }} padding={0}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group justify="space-between" h="100%" wrap="nowrap">
            <Anchor
              component={Link}
              to="/"
              underline="never"
              className="brand-link"
              aria-label="Creative Pitch home"
            >
              <Group gap={10} wrap="nowrap">
                <ThemeIcon size={36} radius="md">
                  <IconPencil size={21} aria-hidden="true" />
                </ThemeIcon>
                <Text fw={700} size="lg" c="var(--text)">
                  Creative Pitch
                </Text>
              </Group>
            </Anchor>
            <Group visibleFrom="sm" gap="xl">
              <nav aria-label="Main navigation">{overview}</nav>
              <Badge color="gray" variant="light">
                Foundation
              </Badge>
            </Group>
            <ActionIcon
              variant="subtle"
              size={44}
              hiddenFrom="sm"
              onClick={open}
              aria-label="Open navigation"
              aria-expanded={opened}
              aria-controls="mobile-navigation"
            >
              <IconMenu2 size={23} aria-hidden="true" />
            </ActionIcon>
          </Group>
        </Container>
      </AppShell.Header>
      <Drawer
        opened={opened}
        onClose={close}
        title="Creative Pitch"
        position="right"
        size="xs"
        closeButtonProps={{ 'aria-label': 'Close navigation' }}
      >
        <nav id="mobile-navigation" aria-label="Mobile navigation">
          {overview}
        </nav>
      </Drawer>
      <AppShell.Main id="main-content" tabIndex={-1}>
        <Container size="lg" py={{ base: 32, sm: 52 }}>
          <AppRoutes />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

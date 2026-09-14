import {
  ActionIcon,
  Anchor,
  AppShell,
  Container,
  Drawer,
  Group,
  NavLink,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconLayoutDashboard, IconMenu2, IconPencil } from '@tabler/icons-react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '../features/auth'
import { UserMenu } from './UserMenu'
import { writingCanvasEnabled } from './development'
import classes from './App.module.css'

export function App() {
  const auth = useAuth()
  const [opened, { open, close }] = useDisclosure(false)
  const { pathname } = useLocation()
  const overview = (
    <NavLink
      component={Link}
      w="auto"
      className={classes.navigation}
      to="/"
      label="Overview"
      active={pathname === '/'}
      aria-current={pathname === '/' ? 'page' : undefined}
      leftSection={<IconLayoutDashboard size={18} aria-hidden="true" />}
      onClick={close}
    />
  )
  const writingCanvas = writingCanvasEnabled && (
    <NavLink
      component={Link}
      w="auto"
      className={classes.navigation}
      to="/spikes/writing-canvas"
      label="Writing Canvas Spike"
      description="Development only"
      active={pathname === '/spikes/writing-canvas'}
      aria-current={pathname === '/spikes/writing-canvas' ? 'page' : undefined}
      leftSection={<IconPencil size={18} aria-hidden="true" />}
      onClick={close}
    />
  )
  const concepts = auth.status === 'authenticated' && (
    <NavLink
      component={Link}
      w="auto"
      className={classes.navigation}
      to="/concepts"
      label="My Concepts"
      active={pathname.startsWith('/concepts')}
      aria-current={pathname.startsWith('/concepts') ? 'page' : undefined}
      leftSection={<IconPencil size={18} aria-hidden="true" />}
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
              className={classes.brandLink}
              aria-label="Creative Pitch home"
            >
              <Group gap={10} wrap="nowrap">
                <ThemeIcon size={38} radius="md" className={classes.brandIcon}>
                  <IconPencil size={21} aria-hidden="true" />
                </ThemeIcon>
                <Text fw={700} size="lg" c="var(--heading)">
                  Creative Pitch
                </Text>
              </Group>
            </Anchor>
            <Group visibleFrom="md" gap="xl">
              <nav aria-label="Main navigation">
                <Group gap="xs" wrap="nowrap">
                  {overview}
                  {concepts}
                  {writingCanvas}
                </Group>
              </nav>
              <UserMenu />
            </Group>
            <ActionIcon
              variant="subtle"
              size={44}
              hiddenFrom="md"
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
        classNames={{ title: classes.drawerTitle }}
      >
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={classes.drawerNavigation}
        >
          {overview}
          {concepts}
          {writingCanvas}
          <UserMenu />
        </nav>
      </Drawer>
      <AppShell.Main id="main-content" tabIndex={-1}>
        <Container size="lg" py={{ base: 24, sm: 36 }}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

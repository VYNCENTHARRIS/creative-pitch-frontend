import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import { App } from './App'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json(
          url.endsWith('/health')
            ? { status: 'ok' }
            : url.endsWith('/ready')
              ? { status: 'ready' }
              : { app_name: 'Creative Pitch', environment: 'local' },
        ),
      ),
    ),
  )
})

it('renders the shell and labeled design examples, with an accessible mobile navigation control', async () => {
  renderWithProviders(<App />, '/')
  expect(screen.getByRole('heading', { name: 'Creative Pitch', level: 1 })).toBeVisible()
  expect(
    within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', {
      name: 'Overview',
    }),
  ).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('heading', { name: 'Design preview' })).toBeVisible()
  expect(
    screen.getByText('Static interface examples. No stored pitches or review data.'),
  ).toBeVisible()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Close navigation' }))
  await user.click(screen.getByRole('button', { name: 'Primary action' }))
  expect(screen.getByText('Primary action preview selected. Nothing was saved.')).toBeVisible()
})

it('handles an unknown route and navigates back to the overview', async () => {
  renderWithProviders(<App />, '/unknown')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await userEvent.setup().click(screen.getByRole('link', { name: 'Back to overview' }))
  expect(screen.getByRole('heading', { name: 'Creative Pitch', level: 1 })).toBeVisible()
})

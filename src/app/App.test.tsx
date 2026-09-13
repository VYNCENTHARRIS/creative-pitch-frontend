import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import { App } from './App'

const environment = vi.hoisted(() => ({ writingCanvasEnabled: true }))
vi.mock('./development', () => environment)

beforeEach(() => {
  environment.writingCanvasEnabled = true
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

it('opens the development spike from desktop and mobile navigation without requesting the backend', async () => {
  renderWithProviders(<App />, '/spikes/writing-canvas')
  expect(await screen.findByRole('textbox', { name: 'Pitch title' })).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
  expect(
    within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', {
      name: /Writing Canvas Spike/,
    }),
  ).toHaveAttribute('aria-current', 'page')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  await user.click(
    within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('link', {
      name: /Writing Canvas Spike/,
    }),
  )
  expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toBeVisible()
})

it('uses the same disabled development guard for navigation and direct route access', () => {
  environment.writingCanvasEnabled = false
  const storageRead = vi.spyOn(Storage.prototype, 'getItem')
  renderWithProviders(<App />, '/spikes/writing-canvas')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(screen.queryByRole('link', { name: /Writing Canvas Spike/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox', { name: 'Pitch body' })).not.toBeInTheDocument()
  expect(storageRead).not.toHaveBeenCalledWith('creative-pitch:writing-canvas-spike:v1')
  expect(fetch).not.toHaveBeenCalled()
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

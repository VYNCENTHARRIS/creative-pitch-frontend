import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { SystemStatus } from './SystemStatus'

function mockBackend(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  const fetchMock = vi.fn((url: string) => {
    const path = new URL(url).pathname
    if (overrides[path]) return Promise.resolve(overrides[path]())
    if (path === '/health') return Promise.resolve(Response.json({ status: 'ok' }))
    if (path === '/ready') return Promise.resolve(Response.json({ status: 'ready' }))
    if (path === '/api/v1/info')
      return Promise.resolve(Response.json({ app_name: 'Creative Pitch', environment: 'local' }))
    throw new Error('Unexpected endpoint')
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('system status', () => {
  it('announces checking while requests are pending', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    renderWithProviders(<SystemStatus />)
    expect(screen.getByRole('status')).toHaveTextContent('Checking connection')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
  })

  it('shows ready and real application information', async () => {
    mockBackend()
    renderWithProviders(<SystemStatus />)
    expect(await screen.findByText('Backend connected. Database ready.')).toBeVisible()
    expect(await screen.findByText('Creative Pitch · Environment: local')).toBeVisible()
  })

  it('shows API unavailable and retry really requests all endpoints again', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<SystemStatus />)
    expect(await screen.findByText('API unavailable')).toBeVisible()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled())
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const recovery = mockBackend()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Backend connected. Database ready.')).toBeVisible()
    expect(recovery.mock.calls.map(([url]) => new URL(url).pathname).sort()).toEqual([
      '/api/v1/info',
      '/health',
      '/ready',
    ])
  })

  it('distinguishes a database outage and safely presents its known message', async () => {
    mockBackend({
      '/ready': () =>
        Response.json(
          { error: { code: 'database_unavailable', message: 'The database is unavailable.' } },
          { status: 503 },
        ),
    })
    renderWithProviders(<SystemStatus />)
    expect(await screen.findByText('API connected — database unavailable')).toBeVisible()
    expect(screen.getByText('The database is unavailable.')).toBeVisible()
    expect(within(screen.getByRole('status')).getByText('Connected')).toBeVisible()
  })

  it('does not call an unknown readiness failure a database outage or expose details', async () => {
    mockBackend({
      '/ready': () =>
        Response.json(
          { error: { code: 'unexpected', message: '/private/path internal stack' } },
          { status: 500 },
        ),
    })
    renderWithProviders(<SystemStatus />)
    expect(await screen.findByText('API connected — readiness unconfirmed')).toBeVisible()
    expect(screen.queryByText(/internal stack/)).not.toBeInTheDocument()
  })

  it('rejects a malformed health success rather than showing ready', async () => {
    mockBackend({ '/health': () => Response.json({ status: 'not-our-contract' }) })
    renderWithProviders(<SystemStatus />)
    expect(await screen.findByText('API unavailable')).toBeVisible()
  })

  it('keeps readiness visible if app information fails and hides unsafe info fields', async () => {
    mockBackend({
      '/api/v1/info': () =>
        Response.json({
          app_name: 'Creative Pitch',
          environment: '/private/path',
          secret: 'private-value',
        }),
    })
    renderWithProviders(<SystemStatus />)
    expect(await screen.findByText('Backend connected. Database ready.')).toBeVisible()
    expect(await screen.findByText('Application information unavailable.')).toBeVisible()
    expect(screen.queryByText(/private/)).not.toBeInTheDocument()
  })
})

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { authHarness, deferred, fakeSession, profile, USER_A, USER_B } from '../../test/auth'
import { renderApp } from '../../test/renderApp'
import { createHttpClient } from '../../shared/api/client'
import { safeReturnPath } from './api'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => Response.json(url.endsWith('/me') ? profile() : [])),
  )
})

it('restores the session, checks /me, ignores forged role metadata, and cleans subscriptions under StrictMode', async () => {
  const auth = authHarness(fakeSession())
  const view = renderApp('/concepts', auth)
  expect(screen.queryByRole('heading', { name: 'My Concepts' })).not.toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'My Concepts' })).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }))
  expect(screen.getByText('Writer')).toBeVisible()
  expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  expect(auth.callbacks.size).toBe(1)
  view.unmount()
  expect(auth.callbacks.size).toBe(0)
  expect(auth.unsubscribe).toHaveBeenCalledTimes(2)
})

it('redirects a signed-out protected route, signs in through /me, and returns to the allowed route', async () => {
  const auth = authHarness()
  const view = renderApp('/concepts/new', auth)
  await screen.findByRole('heading', { name: 'Sign in to Creative Pitch' })
  expect(view.router.state.location.pathname).toBe('/login')
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'writer@example.test' } })
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: ' unchanged password ' },
  })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('heading', { name: 'New Concept' })).toBeVisible()
  expect(auth.client.signInWithPassword).toHaveBeenCalledWith({
    email: 'writer@example.test',
    password: ' unchanged password ',
  })
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:7084/api/v1/me',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer fabricated-access-a' }),
    }),
  )
})

it.each([
  [{ code: 'invalid_credentials' }, 'The email or password is incorrect.'],
  [
    new TypeError('private service detail'),
    'Sign-in is temporarily unavailable or could not be completed. Please try again.',
  ],
])('presents safe sign-in failures without granting access', async (error, message) => {
  const auth = authHarness()
  auth.client.signInWithPassword.mockRejectedValue(error)
  renderApp('/login', auth)
  await screen.findByLabelText(/^Email/)
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'writer@example.test' } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'test' } })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(fetch).not.toHaveBeenCalled()
})

it.each([
  ['profile_required', 403, 'Application access denied'],
  ['account_inactive', 403, 'Application access denied'],
  ['database_unavailable', 503, 'Service temporarily unavailable'],
])('distinguishes /me failure %s', async (code, status, heading) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({ error: { code, message: 'private server details' } }, { status }),
    ),
  )
  renderApp('/concepts', authHarness(fakeSession()))
  expect(await screen.findByRole('heading', { name: heading })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'My Concepts' })).not.toBeInTheDocument()
  expect(screen.queryByText('private server details')).not.toBeInTheDocument()
})

it('does not admit a mismatched profile identity', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(profile(USER_B))),
  )
  renderApp('/concepts', authHarness(fakeSession()))
  expect(
    await screen.findByRole('heading', { name: 'Service temporarily unavailable' }),
  ).toBeVisible()
  expect(screen.queryByText('Second Writer')).not.toBeInTheDocument()
})

it('does not let an old restoration overwrite a newer auth event', async () => {
  const auth = authHarness()
  const initial = deferred<{ data: { session: null }; error: null }>()
  auth.client.getSession.mockReturnValue(initial.promise)
  const stop = auth.controller.start()
  auth.emit(fakeSession())
  initial.resolve({ data: { session: null }, error: null })
  await initial.promise
  expect(auth.controller.getSnapshot().session?.user.id).toBe(USER_A)
  stop()
})

it('uses refreshed tokens without changing the account epoch or clearing the editor', async () => {
  const auth = authHarness(fakeSession())
  renderApp('/concepts/new', auth)
  const title = await screen.findByRole('textbox', { name: 'Concept title' })
  fireEvent.change(title, { target: { value: 'Keep this writing' } })
  const before = auth.controller.getSnapshot()
  act(() => auth.emit(fakeSession(USER_A, 'fabricated-refreshed-token'), 'TOKEN_REFRESHED'))
  expect(screen.getByRole('textbox', { name: 'Concept title' })).toBe(title)
  expect(title).toHaveValue('Keep this writing')
  expect(auth.controller.getSnapshot().epoch).toBe(before.epoch)
  await createHttpClient('http://localhost:7084').get(
    '/health',
    undefined,
    auth.controller.access({ userId: USER_A, epoch: before.epoch }),
  )
  expect(fetch).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer fabricated-refreshed-token' }),
    }),
  )
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/me'))).toHaveLength(1)
})

it('clears private caches on logout and leaves unrelated storage alone', async () => {
  const auth = authHarness(fakeSession())
  const view = renderApp('/concepts', auth)
  await screen.findByText('No concepts yet')
  window.localStorage.setItem('unrelated-test-key', 'keep')
  view.client.setQueryDefaults(['public-test'], { gcTime: Infinity })
  view.client.setQueryData(['public-test'], 'keep')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }))
  await userEvent.setup().click(screen.getByRole('menuitem', { name: 'Sign out' }))
  await screen.findByRole('heading', { name: 'Sign in to Creative Pitch' })
  expect(
    view.client
      .getQueryCache()
      .getAll()
      .filter((query) => query.meta?.private),
  ).toHaveLength(0)
  expect(view.client.getQueryData(['public-test'])).toBe('keep')
  expect(
    view.client
      .getQueryCache()
      .getAll()
      .some((query) => query.queryKey.includes(USER_A) && query.state.data !== undefined),
  ).toBe(false)
  expect(auth.client.signOut).toHaveBeenCalledWith({ scope: 'local' })
  expect(window.localStorage.getItem('unrelated-test-key')).toBe('keep')
  window.localStorage.removeItem('unrelated-test-key')
})

it('reports failed logout truthfully while the session is active', async () => {
  const auth = authHarness(fakeSession())
  auth.client.signOut.mockRejectedValue(new Error('private detail'))
  renderApp('/concepts', auth)
  await screen.findByText('No concepts yet')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Account menu' }))
  await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign out could not be confirmed.')
  expect(auth.controller.getSnapshot().session?.user.id).toBe(USER_A)
})

it('reports session restoration failure without treating it as bad credentials', async () => {
  const auth = authHarness()
  auth.client.getSession.mockRejectedValue(new TypeError('unavailable'))
  renderApp('/concepts', auth)
  expect(
    await screen.findByRole('heading', { name: 'Service temporarily unavailable' }),
  ).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})

it('does not claim logout if the SDK still reports an active session', async () => {
  const auth = authHarness(fakeSession())
  auth.client.signOut.mockResolvedValue({ error: null })
  const stop = auth.controller.start()
  await auth.client.getSession()
  await expect(auth.controller.signOut()).rejects.toThrow('Sign out could not be confirmed')
  expect(auth.controller.getSnapshot().session?.user.id).toBe(USER_A)
  stop()
})

it('prevents a delayed A response from repopulating B private state', async () => {
  const auth = authHarness(fakeSession())
  const delayed = deferred<Response>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const token = (init.headers as Record<string, string>).Authorization
      if (url.endsWith('/me'))
        return Response.json(profile(token?.endsWith('-b') ? USER_B : USER_A))
      return token?.endsWith('-b') ? Response.json([]) : delayed.promise
    }),
  )
  const view = renderApp('/concepts', auth)
  await screen.findByText('Loading your concepts…')
  act(() => auth.emit(fakeSession(USER_B, 'fabricated-access-b')))
  await screen.findByText('No concepts yet')
  await act(async () =>
    delayed.resolve(
      Response.json([
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          title: 'A private draft',
          category: null,
          created_at: '2026-09-13T12:00:00Z',
          draft_updated_at: '2026-09-13T12:00:00Z',
        },
      ]),
    ),
  )
  expect(screen.queryByText('A private draft')).not.toBeInTheDocument()
  expect(
    view.client
      .getQueryCache()
      .getAll()
      .some((query) => query.meta?.owner === USER_A),
  ).toBe(false)
})

it('confirms voluntary logout while dirty, and cancellation keeps the editor', async () => {
  const auth = authHarness(fakeSession())
  renderApp('/concepts/new', auth)
  fireEvent.change(await screen.findByLabelText('Concept title'), { target: { value: 'Unsaved' } })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Account menu' }))
  await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'You have unsaved changes. Leave without saving?',
  )
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep editing' }))
  expect(auth.client.signOut).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Concept title')).toHaveValue('Unsaved')
  await user.click(screen.getByRole('button', { name: 'Account menu' }))
  await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
  await user.click(screen.getByRole('button', { name: 'Leave without saving' }))
  await waitFor(() => expect(screen.queryByLabelText('Concept title')).not.toBeInTheDocument())
})

it.each([
  '//outside.test',
  'https://outside.test',
  '/\\outside.test',
  '/concepts?next=https://outside.test',
  '/login',
  '/concepts/%2foutside',
])('rejects unsafe return route %s', (path) => expect(safeReturnPath(path)).toBe('/concepts'))
it('accepts only the supported internal return routes', () => {
  for (const path of ['/', '/concepts', '/concepts/new', `/concepts/${USER_A}`])
    expect(safeReturnPath(path)).toBe(path)
})

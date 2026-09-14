import { Editor, type JSONContent } from '@tiptap/core'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { authHarness, CONCEPT_ID, deferred, fakeSession, profile, USER_B } from '../../test/auth'
import { renderApp } from '../../test/renderApp'
import type { ConceptDetail, DraftInput } from './types'

const START = '2026-09-13T12:00:00Z'
const SAVED = '2026-09-13T13:00:00Z'
const document = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})
const initial: DraftInput = {
  title: 'Stored concept',
  category: null,
  written_content: document('100 contestants.'),
}
const detail = (input = initial, time = START, id = CONCEPT_ID): ConceptDetail => ({
  id,
  created_at: START,
  draft: { ...input, created_at: START, updated_at: time },
})
let stored: ConceptDetail
let writes: { method: string; url: string; input: DraftInput }[]
let override: ((url: string, init: RequestInit) => Promise<Response> | undefined) | undefined

beforeEach(() => {
  stored = detail()
  writes = []
  override = undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const custom = override?.(url, init)
      if (custom) return custom
      if (url.endsWith('/me')) return Response.json(profile())
      if (init.method === 'POST' || init.method === 'PUT') {
        const input = JSON.parse(init.body as string) as DraftInput
        writes.push({ method: init.method, url, input })
        stored = detail(input, SAVED)
        return Response.json(stored, { status: init.method === 'POST' ? 201 : 200 })
      }
      if (url.endsWith('/mine'))
        return Response.json([
          {
            id: stored.id,
            title: stored.draft.title,
            category: stored.draft.category,
            created_at: START,
            draft_updated_at: stored.draft.updated_at,
          },
        ])
      if (url.includes('/concepts/')) return Response.json(stored)
      return Response.json({ app_name: 'Creative Pitch', environment: 'test' })
    }),
  )
})

function editor() {
  return (
    screen.getByRole('textbox', { name: 'Written document' }) as HTMLElement & { editor: Editor }
  ).editor
}
async function open(route = `/concepts/${CONCEPT_ID}`) {
  const view = renderApp(route, authHarness(fakeSession()))
  await screen.findByLabelText('Concept title')
  return view
}
async function save() {
  await userEvent.setup().click(screen.getByRole('button', { name: 'Save Draft' }))
}
const writeCount = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => init?.method === 'POST' || init?.method === 'PUT').length

it('creates only on first explicit save, then PUTs the same ID, and reopens exact supported content', async () => {
  const view = await open('/concepts/new')
  expect(writeCount()).toBe(0)
  expect(screen.getByRole('status')).toHaveTextContent('Not saved yet')
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: '  Maze  ' } })
  fireEvent.change(screen.getByLabelText('Category (optional)'), {
    target: { value: ' Challenge ' },
  })
  act(() => {
    editor().commands.insertContent('One hundred contestants.')
    editor().commands.selectAll()
    editor().commands.toggleBold()
  })
  const body = editor().getJSON()
  await save()
  await waitFor(() => expect(view.router.state.location.pathname).toBe(`/concepts/${CONCEPT_ID}`))
  expect(writes).toEqual([
    {
      method: 'POST',
      url: 'http://localhost:7084/api/v1/concepts',
      input: { title: 'Maze', category: 'Challenge', written_content: body },
    },
  ])
  expect(screen.getByRole('status')).toHaveTextContent('Saved')
  await save()
  expect(writes[1]?.method).toBe('PUT')
  expect(writes[1]?.url).toBe(`http://localhost:7084/api/v1/concepts/${CONCEPT_ID}/draft`)
  await userEvent.setup().click(screen.getAllByRole('link', { name: 'My Concepts' }).at(-1)!)
  await userEvent.setup().click(await screen.findByRole('link', { name: /Open draft/ }))
  await screen.findByLabelText('Concept title')
  expect(editor().getJSON()).toEqual(body)
  expect(screen.getByLabelText('Concept title')).toHaveValue('Maze')
})

it('saves a blank incomplete new draft', async () => {
  await open('/concepts/new')
  await save()
  expect(writes[0]?.input).toEqual({
    title: '',
    category: null,
    written_content: { type: 'doc', content: [{ type: 'paragraph' }] },
  })
  expect(await screen.findByText('Saved', { exact: true })).toBeVisible()
})

it.each(['POST', 'PUT'])(
  'keeps newer typing and the editor instance when a delayed %s finishes',
  async (method) => {
    const delayed = deferred<Response>()
    let sent: DraftInput | undefined
    override = (_url, init) => {
      if (init.method === method) {
        sent = JSON.parse(init.body as string) as DraftInput
        return delayed.promise
      }
    }
    const view = await open(method === 'POST' ? '/concepts/new' : `/concepts/${CONCEPT_ID}`)
    const instance = editor()
    act(() => instance.commands.setContent(document('100 contestants.')))
    fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Request title' } })
    const button = screen.getByRole('button', { name: 'Save Draft' })
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await waitFor(() => expect(writeCount()).toBe(1))
    act(() => instance.commands.setContent(document('200 contestants.')))
    fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Newer title' } })
    fireEvent.change(screen.getByLabelText('Category (optional)'), {
      target: { value: 'Newer category' },
    })
    await act(async () =>
      delayed.resolve(
        Response.json(detail(sent!, SAVED), { status: method === 'POST' ? 201 : 200 }),
      ),
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes'))
    expect(editor()).toBe(instance)
    expect(editor().getJSON()).toEqual(document('200 contestants.'))
    expect(screen.getByLabelText('Concept title')).toHaveValue('Newer title')
    expect(screen.getByLabelText('Category (optional)')).toHaveValue('Newer category')
    expect(view.router.state.location.pathname).toBe(`/concepts/${CONCEPT_ID}`)
    override = undefined
    await save()
    expect(writes.at(-1)?.input.written_content).toEqual(document('200 contestants.'))
    expect(writes.at(-1)?.method).toBe('PUT')
  },
)

it.each([403, 422, 503])(
  'preserves all writing and the last confirmed timestamp on %s save failure',
  async (status) => {
    await open()
    fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Unsaved title' } })
    fireEvent.change(screen.getByLabelText('Category (optional)'), {
      target: { value: 'Unsaved category' },
    })
    act(() => editor().commands.insertContent('Unsaved body. '))
    const body = editor().getJSON()
    override = (_url, init) =>
      init.method === 'PUT'
        ? Promise.resolve(
            Response.json(
              { error: { code: 'validation_error', message: '<html>private</html>' } },
              { status },
            ),
          )
        : undefined
    await save()
    expect(await screen.findByText('Save failed')).toBeVisible()
    expect(screen.getByLabelText('Concept title')).toHaveValue('Unsaved title')
    expect(screen.getByLabelText('Category (optional)')).toHaveValue('Unsaved category')
    expect(editor().getJSON()).toEqual(body)
    expect(screen.getByText(new Date(START).toLocaleString())).toHaveAttribute('dateTime', START)
    expect(screen.queryByText('<html>private</html>')).not.toBeInTheDocument()
  },
)

it('does not replay an ambiguous create and warns before deliberate retry', async () => {
  await open('/concepts/new')
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Unconfirmed' } })
  override = (_url, init) =>
    init.method === 'POST' ? Promise.reject(new TypeError('lost connection')) : undefined
  await save()
  expect(
    await screen.findByRole('link', { name: 'Check My Concepts before retrying' }),
  ).toBeVisible()
  expect(writeCount()).toBe(1)
  await save()
  expect(screen.getByRole('dialog')).toHaveTextContent('Trying again can create a duplicate')
  expect(writeCount()).toBe(1)
})

it('retains same-user writing through a 401 save and verified reauthentication', async () => {
  const view = await open()
  const instance = editor()
  fireEvent.change(screen.getByLabelText('Concept title'), {
    target: { value: 'Keep through login' },
  })
  override = (_url, init) =>
    init.method === 'PUT'
      ? Promise.resolve(
          Response.json(
            { error: { code: 'authentication_required', message: 'Sign in' } },
            { status: 401 },
          ),
        )
      : undefined
  await save()
  await screen.findByRole('button', { name: 'Sign in again' })
  expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled()
  expect(editor()).toBe(instance)
  expect(view.router.state.location.pathname).toBe(`/concepts/${CONCEPT_ID}`)
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'writer@example.test' } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'synthetic' } })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in again' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Draft' })).toBeEnabled())
  expect(editor()).toBe(instance)
  expect(screen.getByLabelText('Concept title')).toHaveValue('Keep through login')
  override = undefined
  await save()
  expect(writes.at(-1)?.input.title).toBe('Keep through login')
})

it('keeps save success if list invalidation fails', async () => {
  const view = await open()
  vi.spyOn(view.client, 'invalidateQueries').mockRejectedValue(new Error('refresh failed'))
  await save()
  expect(await screen.findByText('Saved', { exact: true })).toBeVisible()
})

it('keeps expired-session writing in memory while removing private server records', async () => {
  const view = await open()
  const instance = editor()
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Recovery only' } })
  act(() => view.auth.emit(null))
  await screen.findByRole('button', { name: 'Sign in again' })
  expect(editor()).toBe(instance)
  expect(
    view.client
      .getQueryCache()
      .getAll()
      .some((query) => query.state.data !== undefined),
  ).toBe(false)
  expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'second@example.test' } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'synthetic' } })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in again' }))
  expect(
    await screen.findByText(
      'Use the same account to recover this writing. To switch accounts, sign out first.',
    ),
  ).toBeVisible()
  expect(view.auth.client.signInWithPassword).not.toHaveBeenCalled()
})

it('reports a /me outage during reauthentication without clearing the working copy', async () => {
  await open()
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Still here' } })
  override = (_url, init) =>
    init.method === 'PUT'
      ? Promise.resolve(
          Response.json(
            { error: { code: 'authentication_required', message: 'Sign in' } },
            { status: 401 },
          ),
        )
      : undefined
  await save()
  await screen.findByRole('button', { name: 'Sign in again' })
  override = (url) =>
    url.endsWith('/me')
      ? Promise.resolve(
          Response.json(
            { error: { code: 'database_unavailable', message: 'Unavailable' } },
            { status: 503 },
          ),
        )
      : undefined
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'synthetic' } })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in again' }))
  expect(
    await screen.findByRole('heading', { name: 'Service temporarily unavailable' }),
  ).toBeVisible()
  expect(screen.getByLabelText('Concept title')).toHaveValue('Still here')
  expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled()
})

it('does not silently replay a timed-out POST', async () => {
  await open('/concepts/new')
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Timeout check' } })
  override = (_url, init) =>
    init.method === 'POST'
      ? new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        )
      : undefined
  vi.useFakeTimers()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6100)
    })
    expect(screen.getByText('Save failed')).toBeVisible()
    expect(writeCount()).toBe(1)
    expect(screen.getByRole('link', { name: 'Check My Concepts before retrying' })).toBeVisible()
  } finally {
    vi.useRealTimers()
  }
})

it('blocks Back, keeps content when canceled, and leaves when confirmed', async () => {
  const view = renderApp('/concepts', authHarness(fakeSession()))
  await userEvent.setup().click(await screen.findByRole('link', { name: /Open draft/ }))
  await screen.findByLabelText('Concept title')
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Back protection' } })
  await act(async () => {
    void view.router.navigate(-1)
  })
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Keep editing' }))
  expect(screen.getByLabelText('Concept title')).toHaveValue('Back protection')
  await act(async () => {
    void view.router.navigate(-1)
  })
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Leave without saving' }))
  await screen.findByRole('heading', { name: 'My Concepts' })
  expect(writeCount()).toBe(0)
})

it('does not promote a departed editor when its delayed create resolves', async () => {
  const delayed = deferred<Response>()
  const view = await open('/concepts/new')
  override = (_url, init) => (init.method === 'POST' ? delayed.promise : undefined)
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Leaving' } })
  await save()
  await userEvent.setup().click(screen.getAllByRole('link', { name: 'My Concepts' }).at(-1)!)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Leave without saving' }))
  await screen.findByRole('heading', { name: 'My Concepts' })
  await act(async () => delayed.resolve(Response.json(detail(), { status: 201 })))
  expect(view.router.state.location.pathname).toBe('/concepts')
  expect(screen.queryByLabelText('Concept title')).not.toBeInTheDocument()
})

it('keeps undo history and selection through ordinary save feedback', async () => {
  await open()
  const instance = editor()
  act(() => {
    instance.commands.setTextSelection(1)
    instance.commands.insertContent('Added. ')
  })
  const position = instance.state.selection.from
  await save()
  expect(editor()).toBe(instance)
  expect(instance.state.selection.from).toBe(position)
  expect(instance.can().undo()).toBe(true)
})

it('rejects unsupported server documents instead of enabling a destructive save', async () => {
  stored.draft.written_content = {
    type: 'doc',
    content: [{ type: 'image', attrs: { src: 'https://example.test/image' } }],
  }
  renderApp(`/concepts/${CONCEPT_ID}`, authHarness(fakeSession()))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This draft cannot be edited with the current editor',
  )
  expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument()
  expect(writeCount()).toBe(0)
})

it('handles unavailable UUIDs safely', async () => {
  renderApp('/concepts/not-a-uuid', authHarness(fakeSession()))
  expect(await screen.findByRole('alert')).toHaveTextContent('Concept unavailable')
})

it('cancels dirty navigation, then leaves without changing the server when confirmed', async () => {
  const view = await open()
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Unsaved' } })
  const user = userEvent.setup()
  await user.click(screen.getAllByRole('link', { name: 'My Concepts' }).at(-1)!)
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'You have unsaved changes. Leave without saving?',
  )
  await user.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(view.router.state.location.pathname).toBe(`/concepts/${CONCEPT_ID}`)
  expect(screen.getByLabelText('Concept title')).toHaveValue('Unsaved')
  await act(async () => {
    void view.router.navigate('/concepts')
  })
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Leave without saving' }),
  )
  await screen.findByRole('heading', { name: 'My Concepts' })
  expect(writeCount()).toBe(0)
})

it('registers beforeunload only as a warning when work needs protection', async () => {
  await open()
  const clean = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(clean)
  expect(clean.defaultPrevented).toBe(false)
  fireEvent.change(screen.getByLabelText('Concept title'), { target: { value: 'Unsaved' } })
  const dirty = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(dirty)
  expect(dirty.defaultPrevented).toBe(true)
})

it('does not apply a pending save after switching accounts', async () => {
  const pending = deferred<Response>()
  const view = await open('/concepts/new')
  override = (url, init) =>
    init.method === 'POST'
      ? pending.promise
      : url.endsWith('/me')
        ? Promise.resolve(Response.json(profile(USER_B)))
        : undefined
  fireEvent.change(screen.getByLabelText('Concept title'), {
    target: { value: 'A private writing' },
  })
  await save()
  act(() => view.auth.emit(fakeSession(USER_B, 'fabricated-access-b')))
  await waitFor(() => expect(screen.getByLabelText('Concept title')).toHaveValue(''))
  await act(async () => pending.resolve(Response.json(detail(), { status: 201 })))
  expect(screen.getByLabelText('Concept title')).toHaveValue('')
  expect(view.router.state.location.pathname).toBe('/concepts/new')
})

it('keeps server ordering, fallback titles and null categories without fetching list bodies', async () => {
  const another = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  override = (url) =>
    url.endsWith('/mine')
      ? Promise.resolve(
          Response.json([
            { id: another, title: '', category: null, created_at: START, draft_updated_at: START },
            {
              id: CONCEPT_ID,
              title: 'Second from server',
              category: 'Challenge',
              created_at: START,
              draft_updated_at: SAVED,
            },
          ]),
        )
      : undefined
  renderApp('/concepts', authHarness(fakeSession()))
  await screen.findByRole('heading', { name: 'Untitled concept' })
  expect(
    screen.getAllByRole('listitem').map((item) => within(item).getByRole('heading').textContent),
  ).toEqual(['Untitled concept', 'Second from server'])
  expect(
    vi
      .mocked(fetch)
      .mock.calls.every(([url]) => String(url).endsWith('/mine') || String(url).endsWith('/me')),
  ).toBe(true)
})

it('shows a list failure separately from empty and retries the request', async () => {
  override = (url) => (url.endsWith('/mine') ? Promise.reject(new TypeError('offline')) : undefined)
  renderApp('/concepts', authHarness(fakeSession()))
  await screen.findByRole('alert')
  expect(screen.queryByText('No concepts yet')).not.toBeInTheDocument()
  const beforeRetry = vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => String(url).endsWith('/mine')).length
  override = (url) => (url.endsWith('/mine') ? Promise.resolve(Response.json([])) : undefined)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('No concepts yet')).toBeVisible()
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/mine'))).toHaveLength(
    beforeRetry + 1,
  )
})

it('product routes never use the spike snapshot key', async () => {
  const get = vi.spyOn(Storage.prototype, 'getItem')
  const set = vi.spyOn(Storage.prototype, 'setItem')
  await open('/concepts/new')
  await save()
  expect(get).not.toHaveBeenCalledWith('creative-pitch:writing-canvas-spike:v1')
  expect(set).not.toHaveBeenCalled()
})

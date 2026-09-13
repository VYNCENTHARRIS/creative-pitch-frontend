import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttpClient } from './client'

const client = createHttpClient('http://localhost:7084')
afterEach(() => vi.useRealTimers())

describe('HTTP client', () => {
  it('parses JSON and sends a credential-free GET request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await client.get('/health')).toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:7084/health',
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      }),
    )
  })

  it('preserves backend status, code, and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'database_unavailable',
              message: 'The database is unavailable.',
            },
          },
          { status: 503 },
        ),
      ),
    )
    await expect(client.get('/ready')).rejects.toMatchObject({
      status: 503,
      code: 'database_unavailable',
      message: 'The database is unavailable.',
      backendMessage: 'The database is unavailable.',
    })
  })

  it('turns network failures into a safe understandable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('internal transport detail')))
    await expect(client.get('/health')).rejects.toMatchObject({
      status: null,
      code: 'network_error',
      message: 'Unable to connect to the backend. Please retry.',
    })
  })

  it('does not expose HTML from failed or malformed successful responses', async () => {
    for (const status of [502, 200]) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('<html>private stack</html>', { status })),
      )
      await expect(client.get('/health')).rejects.toMatchObject({
        status,
        code: 'invalid_response',
        backendMessage: null,
      })
    }
  })

  it('forwards caller cancellation to fetch', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => reject(options.signal?.reason))
          }),
      ),
    )
    const request = client.get('/health', controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('bounds a stalled request so retry becomes available', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => reject(options.signal?.reason))
          }),
      ),
    )
    const result = expect(
      createHttpClient('http://localhost:7084', 50).get('/health'),
    ).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(50)
    await result
  })
})

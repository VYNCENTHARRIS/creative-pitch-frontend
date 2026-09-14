import { env, parseBackendUrl } from '../config/env'
import { isRecord } from '../lib/isRecord'
import { ApiError } from './ApiError'

export interface RequestAccess {
  token: () => string
  assertCurrent: () => void
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (error.status === 401) return 'Sign in again to continue.'
  if (error.status === 403)
    return 'Application access is denied. Your account may be inactive or missing access.'
  if (error.status === 404) return 'Concept unavailable.'
  if (error.status === 422)
    return 'The draft could not be accepted. Check its title, category, and document.'
  if (error.code === 'invalid_response')
    return 'The backend returned an unexpected response. Please try again.'
  if (error.code === 'timeout') return 'The request took too long. Saving could not be confirmed.'
  return 'The service is temporarily unavailable. Please try again.'
}

export function createHttpClient(baseUrl: string, timeoutMs = 6000) {
  const base = parseBackendUrl(baseUrl)
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
    access?: RequestAccess,
  ): Promise<T> {
    // Only fixed backend paths are accepted, and redirects never receive a token.
    if (!/^\/[A-Za-z0-9/-]*$/.test(path) || path.startsWith('//'))
      throw new ApiError('Invalid backend request path.')
    const url = `${base}${path}`
    if (new URL(url).origin !== new URL(base).origin) throw new ApiError('Invalid backend origin.')
    const controller = new AbortController()
    const abort = () => controller.abort(signal?.reason)
    if (signal?.aborted) abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      signal?.throwIfAborted()
      access?.assertCurrent()
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (access) headers.Authorization = `Bearer ${access.token()}`
      const response = await fetch(url, {
        method,
        headers,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      let value: unknown
      try {
        value = await response.json()
      } catch {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        throw new ApiError(
          response.ok
            ? 'The backend returned an unreadable response.'
            : 'The backend could not complete the request.',
          response.status,
          'invalid_response',
        )
      }
      access?.assertCurrent()
      if (!response.ok) {
        const error = isRecord(value) && isRecord(value.error) ? value.error : undefined
        const code = typeof error?.code === 'string' ? error.code : null
        const message = typeof error?.message === 'string' ? error.message : null
        throw new ApiError(
          code === 'database_unavailable'
            ? 'The database is unavailable.'
            : 'The backend could not complete the request.',
          response.status,
          code,
          message,
        )
      }
      return value as T
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      if (
        error instanceof DOMException &&
        error.name === 'AbortError' &&
        !controller.signal.aborted
      )
        throw error
      if (controller.signal.aborted) {
        throw new ApiError('The backend took too long to respond. Please retry.', null, 'timeout')
      }
      if (error instanceof ApiError) throw error
      throw new ApiError('Unable to connect to the backend. Please retry.', null, 'network_error')
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  }
  return {
    get: <T>(path: string, signal?: AbortSignal, access?: RequestAccess) =>
      request<T>('GET', path, undefined, signal, access),
    post: <T>(path: string, body: unknown, access: RequestAccess, signal?: AbortSignal) =>
      request<T>('POST', path, body, signal, access),
    put: <T>(path: string, body: unknown, access: RequestAccess, signal?: AbortSignal) =>
      request<T>('PUT', path, body, signal, access),
  }
}

export const apiClient = createHttpClient(env.backendUrl)

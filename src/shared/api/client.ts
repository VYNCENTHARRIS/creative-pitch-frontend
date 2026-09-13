import { env } from '../config/env'
import { isRecord } from '../lib/isRecord'
import { ApiError } from './ApiError'

export function createHttpClient(baseUrl: string, timeoutMs = 6000) {
  return {
    async get<T>(path: string, signal?: AbortSignal): Promise<T> {
      const controller = new AbortController()
      const abort = () => controller.abort(signal?.reason)
      if (signal?.aborted) abort()
      signal?.addEventListener('abort', abort, { once: true })
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          signal: controller.signal,
        })
        let body: unknown
        try {
          body = await response.json()
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

        if (!response.ok) {
          const error = isRecord(body) && isRecord(body.error) ? body.error : undefined
          const code = typeof error?.code === 'string' ? error.code : null
          const message = typeof error?.message === 'string' ? error.message : null
          throw new ApiError(
            message ?? 'The backend could not complete the request.',
            response.status,
            code,
            message,
          )
        }
        return body as T
      } catch (error) {
        if (signal?.aborted) throw signal.reason
        if (controller.signal.aborted) {
          throw new ApiError('The backend took too long to respond. Please retry.', null, 'timeout')
        }
        if (error instanceof ApiError) throw error
        throw new ApiError('Unable to connect to the backend. Please retry.', null, 'network_error')
      } finally {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
      }
    },
  }
}

export const apiClient = createHttpClient(env.backendUrl)

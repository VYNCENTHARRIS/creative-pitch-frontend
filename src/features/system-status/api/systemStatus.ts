import { ApiError } from '../../../shared/api/ApiError'
import { apiClient } from '../../../shared/api/client'
import { isRecord } from '../../../shared/lib/isRecord'
import type { AppInfo, HealthResponse, ReadyResponse } from '../types/status'

function invalidResponse(): never {
  throw new ApiError(
    'The backend returned unexpected status information.',
    null,
    'invalid_response',
  )
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const body = await apiClient.get<unknown>('/health', signal)
  if (!isRecord(body) || body.status !== 'ok') invalidResponse()
  return { status: 'ok' }
}

export async function getReadiness(signal?: AbortSignal): Promise<ReadyResponse> {
  const body = await apiClient.get<unknown>('/ready', signal)
  if (!isRecord(body) || body.status !== 'ready') invalidResponse()
  return { status: 'ready' }
}

export async function getAppInfo(signal?: AbortSignal): Promise<AppInfo> {
  const body = await apiClient.get<unknown>('/api/v1/info', signal)
  // Only display the app identity and known public environment labels.
  const environments = ['local', 'development', 'test', 'staging', 'production', 'preview']
  if (
    !isRecord(body) ||
    body.app_name !== 'Creative Pitch' ||
    typeof body.environment !== 'string' ||
    !environments.includes(body.environment)
  ) {
    invalidResponse()
  }
  return { app_name: 'Creative Pitch', environment: body.environment }
}

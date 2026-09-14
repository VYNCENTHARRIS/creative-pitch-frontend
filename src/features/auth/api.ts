import { ApiError } from '../../shared/api/ApiError'
import { apiClient, type RequestAccess } from '../../shared/api/client'
import { isRecord } from '../../shared/lib/isRecord'
import { isUuid } from '../../shared/lib/json'

export interface CurrentUser {
  id: string
  email: string
  display_name: string
  role: 'writer' | 'admin'
}

export async function getCurrentUser(
  userId: string,
  access: RequestAccess,
  signal?: AbortSignal,
): Promise<CurrentUser> {
  const value = await apiClient.get<unknown>('/api/v1/me', signal, access)
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    value.id !== userId ||
    typeof value.email !== 'string' ||
    typeof value.display_name !== 'string' ||
    !value.display_name.trim() ||
    (value.role !== 'writer' && value.role !== 'admin')
  ) {
    throw new ApiError('Application access could not be verified.', null, 'invalid_response')
  }
  return { id: value.id, email: value.email, display_name: value.display_name, role: value.role }
}

export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    (value === '/' ||
      value === '/concepts' ||
      value === '/concepts/new' ||
      (value.startsWith('/concepts/') && isUuid(value.slice('/concepts/'.length))))
    ? value
    : '/concepts'
}

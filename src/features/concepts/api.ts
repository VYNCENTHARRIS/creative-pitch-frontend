import { ApiError } from '../../shared/api/ApiError'
import { apiClient, type RequestAccess } from '../../shared/api/client'
import { isRecord } from '../../shared/lib/isRecord'
import { isTimestamp, isUuid } from '../../shared/lib/json'
import type { ConceptDetail, ConceptSummary, DraftInput } from './types'

function invalid(): never {
  throw new ApiError('Unexpected Concept response.', null, 'invalid_response')
}
function draftFields(value: Record<string, unknown>) {
  return (
    typeof value.title === 'string' &&
    (value.category === null || typeof value.category === 'string')
  )
}
export function parseConcept(value: unknown): ConceptDetail {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isTimestamp(value.created_at) ||
    !isRecord(value.draft)
  )
    invalid()
  const draft = value.draft
  if (
    !draftFields(draft) ||
    !isTimestamp(draft.created_at) ||
    !isTimestamp(draft.updated_at) ||
    !isRecord(draft.written_content) ||
    draft.written_content.type !== 'doc' ||
    ('content' in draft.written_content && !Array.isArray(draft.written_content.content))
  )
    invalid()
  return {
    id: value.id,
    created_at: value.created_at,
    draft: {
      title: draft.title as string,
      category: draft.category as string | null,
      written_content: draft.written_content,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
    },
  }
}
export function parseConcepts(value: unknown): ConceptSummary[] {
  if (!Array.isArray(value)) invalid()
  const ids = new Set<string>()
  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      !isUuid(item.id) ||
      !draftFields(item) ||
      !isTimestamp(item.created_at) ||
      !isTimestamp(item.draft_updated_at) ||
      ids.has(item.id)
    )
      invalid()
    ids.add(item.id)
    return {
      id: item.id,
      title: item.title as string,
      category: item.category as string | null,
      created_at: item.created_at,
      draft_updated_at: item.draft_updated_at,
    }
  })
}
export function createConceptApi(access: RequestAccess) {
  const path = (id: string) => {
    if (!isUuid(id)) throw new ApiError('Concept unavailable.', 404, 'concept_not_found')
    return `/api/v1/concepts/${id}`
  }
  return {
    mine: async ({ signal }: { signal: AbortSignal }) =>
      parseConcepts(await apiClient.get<unknown>('/api/v1/concepts/mine', signal, access)),
    detail: async (id: string, signal: AbortSignal) => {
      const result = parseConcept(await apiClient.get<unknown>(path(id), signal, access))
      if (result.id !== id) invalid()
      return result
    },
    save: async ({
      id,
      input,
      signal,
    }: {
      id: string | null
      input: DraftInput
      signal: AbortSignal
    }) => {
      const payload = {
        title: input.title,
        category: input.category,
        written_content: input.written_content,
      }
      const result = parseConcept(
        await (id
          ? apiClient.put<unknown>(`${path(id)}/draft`, payload, access, signal)
          : apiClient.post<unknown>('/api/v1/concepts', payload, access, signal)),
      )
      if (id && result.id !== id) invalid()
      return result
    },
  }
}

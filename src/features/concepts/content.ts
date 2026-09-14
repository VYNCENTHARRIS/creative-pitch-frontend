import { stableJson } from '../../shared/lib/json'
import { editableDocument } from './editor/schema'
import type { DraftInput } from './types'

// Python str.strip includes these control spaces and excludes the JavaScript BOM.
export function trimDraftText(value: string): string {
  const space = (character: string) => {
    const code = character.charCodeAt(0)
    return (
      (code >= 9 && code <= 13) ||
      (code >= 28 && code <= 32) ||
      code === 133 ||
      /[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/.test(character)
    )
  }
  let start = 0
  let end = value.length
  while (start < end && space(value[start]!)) start++
  while (end > start && space(value[end - 1]!)) end--
  return value.slice(start, end)
}

function checkText(value: string) {
  if (
    value.includes('\0') ||
    Array.from(value).some(
      (character) => character.length === 1 && /[\ud800-\udfff]/.test(character),
    )
  )
    throw new Error(
      'The draft contains text that cannot be stored. Remove invalid characters and try again.',
    )
}

export function normalizeDraft(input: DraftInput): DraftInput {
  return {
    title: trimDraftText(input.title),
    category: trimDraftText(input.category ?? '') || null,
    written_content: structuredClone(input.written_content),
  }
}

export function draftErrors(input: DraftInput): {
  title?: string
  category?: string
  document?: string
} {
  const errors: { title?: string; category?: string; document?: string } = {}
  const value = normalizeDraft(input)
  if (Array.from(value.title).length > 200)
    errors.title = 'Keep the title to 200 characters or fewer.'
  if (Array.from(value.category ?? '').length > 80)
    errors.category = 'Keep the category to 80 characters or fewer.'
  try {
    checkText(value.title)
    checkText(value.category ?? '')
    const inspect = (item: unknown): void => {
      if (typeof item === 'string') checkText(item)
      else if (typeof item === 'number' && !Number.isFinite(item))
        throw new Error('The document contains invalid numbers.')
      else if (item !== null && typeof item === 'object')
        Object.entries(item).forEach(([key, child]) => {
          checkText(key)
          inspect(child)
        })
      else if (item !== null && typeof item !== 'number' && typeof item !== 'boolean')
        throw new Error('The document contains invalid values.')
    }
    inspect(value.written_content)
    if (new TextEncoder().encode(JSON.stringify(value.written_content)).byteLength > 256 * 1024)
      errors.document = 'The document exceeds 256 KiB. Shorten it before saving.'
    editableDocument(value.written_content)
  } catch {
    errors.document =
      'The draft contains invalid or unsupported data. It cannot be saved with the current editor.'
  }
  return errors
}

export function sameDraft(left: DraftInput, right: DraftInput): boolean {
  const comparable = (input: DraftInput) => ({
    ...normalizeDraft(input),
    written_content: editableDocument(input.written_content),
  })
  try {
    return stableJson(comparable(left)) === stableJson(comparable(right))
  } catch {
    return false
  }
}

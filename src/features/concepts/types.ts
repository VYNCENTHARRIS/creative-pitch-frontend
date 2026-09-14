import type { JSONContent } from '@tiptap/core'

export interface DraftInput {
  title: string
  category: string | null
  written_content: JSONContent
}
export interface ConceptDetail {
  id: string
  created_at: string
  draft: DraftInput & { created_at: string; updated_at: string }
}
export interface ConceptSummary {
  id: string
  title: string
  category: string | null
  created_at: string
  draft_updated_at: string
}

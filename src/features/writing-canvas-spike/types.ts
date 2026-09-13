import type { JSONContent } from '@tiptap/core'

export interface WorkingDocument {
  title: string
  document: JSONContent
}

export interface TestSnapshot extends WorkingDocument {
  format: 'creative-pitch-writing-canvas-v1'
  savedAt: string
}

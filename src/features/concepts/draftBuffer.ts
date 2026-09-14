import { draftErrors, normalizeDraft, sameDraft } from './content'
import { emptyDocument } from './editor/schema'
import type { ConceptDetail, DraftInput } from './types'

export class DraftBuffer {
  private listeners = new Set<() => void>()
  private state: {
    working: DraftInput
    baseline: DraftInput
    id: string | null
    savedAt: string | null
    saving: boolean
    error: unknown
    ambiguous: boolean
    errors: ReturnType<typeof draftErrors>
  }
  constructor(initial: ConceptDetail | null) {
    const working = initial
      ? normalizeDraft(initial.draft)
      : { title: '', category: null, written_content: emptyDocument() }
    this.state = {
      working,
      baseline: structuredClone(working),
      id: initial?.id ?? null,
      savedAt: initial?.draft.updated_at ?? null,
      saving: false,
      error: null,
      ambiguous: false,
      errors: {},
    }
  }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private update(patch: Partial<typeof this.state>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }
  change = (patch: Partial<DraftInput>) => {
    this.update({ working: { ...this.state.working, ...patch } })
  }
  dirty = () => !sameDraft(this.state.working, this.state.baseline)
  needsWarning = () => this.dirty() || this.state.saving || this.state.ambiguous
  private transitionPath: string | null = null
  allows = (path: string) => path === this.transitionPath
  transitionDone = () => {
    this.transitionPath = null
  }
  begin = () => {
    if (this.state.saving) return null
    const errors = draftErrors(this.state.working)
    if (Object.keys(errors).length) {
      this.update({ errors })
      return null
    }
    const input = normalizeDraft(this.state.working)
    this.update({ saving: true, error: null, errors: {} })
    return { id: this.state.id, input }
  }
  confirm = (response: ConceptDetail) => {
    const created = !this.state.id
    // Keep newer typing when an earlier save finishes.
    this.update({
      id: response.id,
      baseline: normalizeDraft(response.draft),
      savedAt: response.draft.updated_at,
      saving: false,
      error: null,
      ambiguous: false,
    })
    if (created) this.transitionPath = `/concepts/${response.id}`
  }
  fail = (error: unknown, ambiguous: boolean) => {
    this.update({ saving: false, error, ambiguous })
  }
}

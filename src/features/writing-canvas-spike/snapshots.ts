import { isRecord } from '../../shared/lib/isRecord'
import { validateDocument } from './editor'
import type { TestSnapshot, WorkingDocument } from './types'

export const SNAPSHOT_KEY = 'creative-pitch:writing-canvas-spike:v1'
const FORMAT = 'creative-pitch-writing-canvas-v1'

export type SnapshotRead =
  | { status: 'valid'; raw: string; snapshot: TestSnapshot }
  | { status: 'empty'; raw: null }
  | { status: 'invalid'; raw: string; message: string }
  | { status: 'unavailable'; raw: null; message: string }

export function parseSnapshot(raw: string): TestSnapshot {
  const value: unknown = JSON.parse(raw)
  if (
    !isRecord(value) ||
    value.format !== FORMAT ||
    typeof value.title !== 'string' ||
    typeof value.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.savedAt)) ||
    new Date(value.savedAt).toISOString() !== value.savedAt
  ) {
    throw new Error('Incompatible snapshot envelope')
  }
  return {
    format: FORMAT,
    title: value.title,
    document: validateDocument(value.document),
    savedAt: value.savedAt,
  }
}

export function readSnapshot(): SnapshotRead {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(SNAPSHOT_KEY)
  } catch {
    return {
      status: 'unavailable',
      raw: null,
      message: 'Browser storage is unavailable. Nothing was loaded.',
    }
  }
  if (raw === null) return { status: 'empty', raw: null }
  try {
    return { status: 'valid', raw, snapshot: parseSnapshot(raw) }
  } catch {
    return {
      status: 'invalid',
      raw,
      message:
        'The stored test snapshot is invalid or incompatible. It has been kept. Delete it or explicitly replace it to continue.',
    }
  }
}

function checkUnchanged(expectedRaw: string | null) {
  if (window.localStorage.getItem(SNAPSHOT_KEY) !== expectedRaw) {
    throw new Error('The stored snapshot changed. Check it again before replacing or deleting it.')
  }
}

export function saveSnapshot(working: WorkingDocument, expectedRaw: string | null): SnapshotRead {
  try {
    const snapshot: TestSnapshot = {
      format: FORMAT,
      title: working.title,
      document: validateDocument(working.document),
      savedAt: new Date().toISOString(),
    }
    const raw = JSON.stringify(snapshot)
    checkUnchanged(expectedRaw)
    window.localStorage.setItem(SNAPSHOT_KEY, raw)
    return { status: 'valid', raw, snapshot: parseSnapshot(raw) }
  } catch {
    return {
      status: 'unavailable',
      raw: null,
      message:
        'Test snapshot was not saved. Storage may be full, unavailable, or changed in another tab. Check storage and try again.',
    }
  }
}

export function deleteSnapshot(expectedRaw: string): string | null {
  try {
    checkUnchanged(expectedRaw)
    window.localStorage.removeItem(SNAPSHOT_KEY)
    return null
  } catch {
    return 'Test snapshot was not deleted. Storage may be unavailable or changed in another tab. Try again.'
  }
}

export function copySnapshot(snapshot: TestSnapshot): WorkingDocument {
  // Keep a separate copy so editing cannot change the saved snapshot.
  return { title: snapshot.title, document: structuredClone(snapshot.document) }
}

export function sameDocument(left: WorkingDocument, right: WorkingDocument): boolean {
  return (
    left.title === right.title && JSON.stringify(left.document) === JSON.stringify(right.document)
  )
}

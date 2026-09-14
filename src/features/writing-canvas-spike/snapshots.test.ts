import { Editor } from '@tiptap/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { documentExtensions, emptyDocument, validateDocument } from '../concepts'
import { ReadOnlyGuard } from './readOnlyGuard'
import { sample } from './sample'
import {
  copySnapshot,
  deleteSnapshot,
  parseSnapshot,
  readSnapshot,
  saveSnapshot,
  SNAPSHOT_KEY,
} from './snapshots'

const editors: Editor[] = []
function createEditor(content = sample.document, readonly = false) {
  const editor = new Editor({
    extensions: [...documentExtensions(), ...(readonly ? [ReadOnlyGuard] : [])],
    content,
    editable: !readonly,
    enableContentCheck: true,
  })
  editors.push(editor)
  return editor
}

beforeEach(() => {
  window.localStorage.removeItem(SNAPSHOT_KEY)
  // pasteHTML/pasteText still use ProseMirror's real parser; jsdom lacks ClipboardEvent.
  vi.stubGlobal('ClipboardEvent', Event)
})
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy())
  window.localStorage.removeItem(SNAPSHOT_KEY)
})

it('round trips the complete normalized editor document and title through serialization and a fresh editor', () => {
  const original = createEditor()
  original.commands.setContent(sample.document, { emitUpdate: false, errorOnInvalidContent: true })
  const document = original.getJSON()
  expect(saveSnapshot({ title: sample.title, document }, null).status).toBe('valid')
  const loaded = readSnapshot()
  expect(loaded.status).toBe('valid')
  if (loaded.status !== 'valid') throw new Error('Expected snapshot')
  expect(loaded.snapshot.title).toBe(sample.title)
  expect(loaded.snapshot.document).toEqual(document)
  expect(createEditor(loaded.snapshot.document).getJSON()).toEqual(document)
  expect(loaded.snapshot.savedAt).toBe(new Date(loaded.snapshot.savedAt).toISOString())
})

it('reports missing storage without manufacturing a saved document', () => {
  expect(readSnapshot()).toEqual({ status: 'empty', raw: null })
})

it.each([
  '{broken',
  '{}',
  JSON.stringify({
    format: 'old-format',
    title: 'Old',
    document: emptyDocument(),
    savedAt: new Date().toISOString(),
  }),
])('keeps malformed or incompatible storage intact: %s', (raw) => {
  window.localStorage.setItem(SNAPSHOT_KEY, raw)
  expect(readSnapshot().status).toBe('invalid')
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
})

describe('schema validation', () => {
  it.each([
    { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://example.com/image.png' } }] },
    { type: 'doc', content: [{ type: 'text', text: 'Invalid top-level text' }] },
    { type: 'paragraph' },
    { type: 'doc', content: [] },
    {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'Heading' }] },
      ],
    },
    {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Code', marks: [{ type: 'code' }] }] },
      ],
    },
    {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 'bad' },
          content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
        },
      ],
    },
  ])('rejects unsupported or invalid structures without stripping them', (document) => {
    const raw = JSON.stringify({
      format: 'creative-pitch-writing-canvas-v1',
      title: '',
      document,
      savedAt: new Date().toISOString(),
    })
    window.localStorage.setItem(SNAPSHOT_KEY, raw)
    expect(readSnapshot().status).toBe('invalid')
    expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///tmp/example',
    'https://user:pass@example.com',
  ])('rejects unsafe saved links and link commands: %s', (href) => {
    const editor = createEditor(emptyDocument())
    editor.commands.insertContent('Reference')
    editor.commands.selectAll()
    expect(editor.commands.setLink({ href })).toBe(false)
    expect(() =>
      validateDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Reference', marks: [{ type: 'link', attrs: { href } }] },
            ],
          },
        ],
      }),
    ).toThrow()
  })

  it('reduces unsupported pasted HTML to supported text and formatting', () => {
    const editor = createEditor(emptyDocument())
    editor.view.pasteHTML(
      '<h6>Small heading</h6><blockquote><p><u>Plain</u> <strong>bold</strong> <code>code text</code></p></blockquote><table><tr><td>Cell text</td></tr></table><img src="https://example.com/image.png">',
    )
    expect(editor.getJSON()).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Small heading' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Plain ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
            { type: 'text', text: ' code text' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Cell text' }] },
      ],
    })
  })
})

it('reports storage read and write failures without claiming success', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  expect(readSnapshot().status).toBe('unavailable')
  vi.restoreAllMocks()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  expect(saveSnapshot({ title: '', document: emptyDocument() }, null).status).toBe('unavailable')
})

it('deletes only the spike key and refuses to overwrite a changed source', () => {
  const editor = createEditor()
  saveSnapshot({ title: sample.title, document: editor.getJSON() }, null)
  const raw = window.localStorage.getItem(SNAPSHOT_KEY)!
  window.localStorage.setItem('unrelated-test-key', 'keep')
  expect(
    saveSnapshot({ title: 'Unexpected overwrite', document: emptyDocument() }, null).status,
  ).toBe('unavailable')
  expect(deleteSnapshot('stale value')).toBeTruthy()
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
  expect(deleteSnapshot(raw)).toBeNull()
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBeNull()
  expect(window.localStorage.getItem('unrelated-test-key')).toBe('keep')
  window.localStorage.removeItem('unrelated-test-key')
})

it('edits a detached clone without changing the actual serialized source or its preview', () => {
  const source = createEditor()
  saveSnapshot({ title: sample.title, document: source.getJSON() }, null)
  const before = window.localStorage.getItem(SNAPSHOT_KEY)!
  const snapshot = parseSnapshot(before)
  const copy = copySnapshot(snapshot)
  copy.title = 'A different title'
  const editor = createEditor(copy.document)
  editor.commands.insertContent('A new opening. ')
  expect(editor.getJSON()).not.toEqual(snapshot.document)
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(before)
  expect(createEditor(snapshot.document, true).getJSON()).toEqual(snapshot.document)
})

it('blocks changes through commands in a non-editable snapshot renderer', () => {
  const editor = createEditor(sample.document, true)
  const before = editor.getJSON()
  expect(editor.isEditable).toBe(false)
  editor.commands.insertContent('Should not appear')
  editor.commands.selectAll()
  editor.commands.toggleBold()
  editor.view.pasteText('Should not paste')
  expect(editor.getJSON()).toEqual(before)
})

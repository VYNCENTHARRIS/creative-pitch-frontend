import { Editor } from '@tiptap/core'
import { expect, it } from 'vitest'
import { draftErrors, normalizeDraft, sameDraft } from './content'
import { documentExtensions, editableDocument, emptyDocument } from './editor/schema'
import { DraftBuffer } from './draftBuffer'
import { parseConcept, parseConcepts } from './api'
import type { ConceptDetail, DraftInput } from './types'

const input = (): DraftInput => ({ title: '', category: null, written_content: emptyDocument() })
const stored = (draft: DraftInput): ConceptDetail => ({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  created_at: '2026-09-13T12:00:00Z',
  draft: { ...draft, created_at: '2026-09-13T12:00:00Z', updated_at: '2026-09-13T13:00:00Z' },
})

it('matches trimming and Unicode character limits instead of UTF-16 code units', () => {
  expect(
    normalizeDraft({ ...input(), title: '\u001c Title\u0085', category: '\u0085\u3000' }),
  ).toMatchObject({ title: 'Title', category: null })
  expect(normalizeDraft({ ...input(), title: '\ufeffTitle\ufeff' }).title).toBe('\ufeffTitle\ufeff')
  expect(draftErrors({ ...input(), title: '𐐀'.repeat(200), category: 'é'.repeat(80) })).toEqual({})
  expect(
    draftErrors({ ...input(), title: 'a'.repeat(201), category: 'b'.repeat(81) }),
  ).toMatchObject({ title: expect.any(String), category: expect.any(String) })
})

it('measures compact UTF-8 JSON at the exact 256 KiB boundary', () => {
  const content = (text: string) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  })
  const overhead = new TextEncoder().encode(JSON.stringify(content(''))).byteLength
  expect(
    draftErrors({ ...input(), written_content: content('a'.repeat(262144 - overhead)) }),
  ).toEqual({})
  expect(
    draftErrors({ ...input(), written_content: content('a'.repeat(262145 - overhead)) }).document,
  ).toContain('256 KiB')
  expect(
    draftErrors({ ...input(), written_content: content('é'.repeat(150000)) }).document,
  ).toContain('256 KiB')
})

it.each(['\0', '\ud800', '\udfff'])('rejects JSONB-unrepresentable text', (text) => {
  expect(draftErrors({ ...input(), title: text }).document).toBeTruthy()
})

it('accepts an empty backend root without inventing content to overwrite', () => {
  for (const document of [{ type: 'doc' }, { type: 'doc', content: [] }]) {
    expect(editableDocument(document)).toEqual(emptyDocument())
    expect(sameDraft({ ...input(), written_content: document }, input())).toBe(true)
  }
})

it.each([
  { type: 'doc', custom: 'must not lose' },
  { type: 'doc', content: [{ type: 'paragraph', attrs: { unknown: 'must not lose' } }] },
  { type: 'doc', content: [{ type: 'paragraph', text: 'must not lose' }] },
  { type: 'doc', content: [{ type: 'unknownNode' }] },
  {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Reference',
            marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
          },
        ],
      },
    ],
  },
])('refuses unsupported saved data instead of stripping it', (document) => {
  expect(() => editableDocument(document)).toThrow()
})

it('ignores JSONB key order while preserving meaningful structure', () => {
  const left = {
    ...input(),
    written_content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
      ],
    },
  }
  const right = {
    ...input(),
    written_content: {
      content: [
        { attrs: { level: 2 }, content: [{ text: 'Heading', type: 'text' }], type: 'heading' },
      ],
      type: 'doc',
    },
  }
  expect(sameDraft(left, right)).toBe(true)
  right.written_content.content[0]!.content[0]!.text = 'Different'
  expect(sameDraft(left, right)).toBe(false)
})

it('round trips marks and safe links through real Tiptap', () => {
  const document = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Reference',
            marks: [
              { type: 'bold' },
              { type: 'italic' },
              { type: 'link', attrs: { href: 'https://example.test/reference' } },
            ],
          },
        ],
      },
    ],
  }
  const editor = new Editor({
    extensions: documentExtensions(),
    content: editableDocument(document),
  })
  const normalized = editor.getJSON()
  expect(editableDocument(JSON.parse(JSON.stringify(normalized)))).toEqual(normalized)
  editor.destroy()
})

it('captures a detached snapshot, prevents overlapping saves, and handles reverting during a save', () => {
  const buffer = new DraftBuffer(stored({ ...input(), title: 'Original' }))
  buffer.change({ title: 'Sent' })
  const sent = buffer.begin()!
  expect(buffer.begin()).toBeNull()
  buffer.change({ title: 'Original' })
  expect(sent.input.title).toBe('Sent')
  buffer.confirm(stored(sent.input))
  expect(buffer.dirty()).toBe(true)
  expect(buffer.getSnapshot().working.title).toBe('Original')
})

it.each([null, {}, [], { id: 'not-a-uuid', draft: {} }])(
  'rejects malformed detail and list responses',
  (value) => {
    expect(() => parseConcept(value)).toThrow()
    if (!Array.isArray(value)) expect(() => parseConcepts(value)).toThrow()
  },
)

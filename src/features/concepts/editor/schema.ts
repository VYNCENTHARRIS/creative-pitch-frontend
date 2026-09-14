import { Link } from '@mantine/tiptap'
import { getSchema, type JSONContent } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { isRecord } from '../../../shared/lib/isRecord'

export function isSafeLink(value: unknown): value is string {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      !/[\s\\]/.test(value) &&
      Array.from(value).every((character) => character.charCodeAt(0) >= 32)
    )
  } catch {
    return false
  }
}

const SafeLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        validate: (value: unknown) => {
          if (!isSafeLink(value)) throw new Error('Unsupported link')
        },
      },
      target: {
        default: '_blank',
        parseHTML: () => '_blank',
        validate: (value: unknown) => {
          if (value !== '_blank') throw new Error('Unsupported link target')
        },
      },
      rel: {
        default: 'noopener noreferrer',
        parseHTML: () => 'noopener noreferrer',
        validate: (value: unknown) => {
          if (value !== 'noopener noreferrer') throw new Error('Unsupported link protection')
        },
      },
      class: {
        default: null,
        parseHTML: () => null,
        validate: (value: unknown) => {
          if (value !== null) throw new Error('Unsupported link styling')
        },
      },
      title: { default: null, validate: 'string|null' },
    }
  },
}).configure({
  openOnClick: false,
  defaultProtocol: 'https',
  isAllowedUri: (url, context) => context.defaultValidate(url) && isSafeLink(url),
})

export function documentExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      underline: false,
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
    SafeLink,
    Placeholder.configure({ placeholder: 'Start with the idea that makes someone lean in…' }),
  ]
}

const schema = getSchema(documentExtensions())

export function validateDocument(value: unknown): JSONContent {
  function checkKeys(item: unknown, mark = false) {
    if (!isRecord(item) || typeof item.type !== 'string') throw new Error('Unsupported document')
    const type = mark ? schema.marks[item.type] : schema.nodes[item.type]
    if (!type) throw new Error('Unsupported document type')
    const allowed = mark ? ['type', 'attrs'] : ['type', 'attrs', 'content', 'marks', 'text']
    if (Object.keys(item).some((key) => !allowed.includes(key)))
      throw new Error('Unsupported document fields')
    if (
      item.attrs !== undefined &&
      (!isRecord(item.attrs) ||
        Object.keys(item.attrs).some((key) => !Object.hasOwn(type.spec.attrs ?? {}, key)))
    )
      throw new Error('Unsupported attributes')
    if (
      !mark &&
      ((item.type !== 'text' && 'text' in item) || (item.type === 'text' && 'content' in item))
    )
      throw new Error('Unsupported text fields')
    if (item.content !== undefined) {
      if (!Array.isArray(item.content)) throw new Error('Unsupported content')
      item.content.forEach((child) => checkKeys(child))
    }
    if (item.marks !== undefined) {
      if (!Array.isArray(item.marks)) throw new Error('Unsupported marks')
      item.marks.forEach((child) => checkKeys(child, true))
    }
  }
  checkKeys(value)
  const node = schema.nodeFromJSON(value)
  node.check()
  if (node.type !== schema.topNodeType) throw new Error('Expected a document')
  // Base extension schemas do not constrain these attributes when loading JSON.
  node.descendants((child) => {
    const level: unknown = child.attrs.level
    if (child.type.name === 'heading' && level !== 1 && level !== 2 && level !== 3) {
      throw new Error('Unsupported heading')
    }
    const start: unknown = child.attrs.start
    if (
      child.type.name === 'orderedList' &&
      (typeof start !== 'number' || !Number.isSafeInteger(start) || start < 1)
    ) {
      throw new Error('Unsupported list start')
    }
  })
  return node.toJSON() as JSONContent
}

export function editableDocument(value: unknown): JSONContent {
  // The backend also accepts an empty root. Give that document a place to type.
  if (
    isRecord(value) &&
    value.type === 'doc' &&
    Object.keys(value).every((key) => key === 'type' || key === 'content') &&
    (value.content === undefined || (Array.isArray(value.content) && value.content.length === 0))
  )
    return emptyDocument()
  return validateDocument(value)
}

export function emptyDocument(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

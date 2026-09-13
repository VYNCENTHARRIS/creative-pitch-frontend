import { Editor } from '@tiptap/core'
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { parseSnapshot, SNAPSHOT_KEY } from '../snapshots'
import { sample } from '../sample'
import { WritingCanvasSpike } from './WritingCanvasSpike'

beforeEach(() => window.localStorage.removeItem(SNAPSHOT_KEY))
afterEach(() => window.localStorage.removeItem(SNAPSHOT_KEY))

function bodyEditor() {
  // Tiptap attaches its real instance to the editor DOM; these tests do not replace it.
  return (screen.getByRole('textbox', { name: 'Pitch body' }) as HTMLElement & { editor: Editor })
    .editor
}

async function loadAndSave() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Load sample' }))
  await user.click(screen.getByRole('button', { name: 'Save test snapshot' }))
  return user
}

it('starts empty with labeled controls and no snapshot-dependent actions', () => {
  renderWithProviders(
    <StrictMode>
      <WritingCanvasSpike />
    </StrictMode>,
  )
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toHaveValue('')
  expect(bodyEditor().getJSON()).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  expect(screen.getByRole('combobox', { name: 'Paragraph style' })).toHaveValue('paragraph')
  for (const name of [
    'Read-only preview',
    'Reload test snapshot',
    'Clone snapshot to working copy',
    'Delete test snapshot',
    'Undo',
    'Redo',
  ]) {
    expect(screen.getByRole('button', { name })).toBeDisabled()
  }
  expect(screen.getByText('Inspect saved JSON').closest('details')).not.toHaveAttribute('open')
})

it('confirms sample replacement, clearing and deletion, and keeps clearing separate from deletion', async () => {
  renderWithProviders(<WritingCanvasSpike />)
  const user = await loadAndSave()
  const raw = window.localStorage.getItem(SNAPSHOT_KEY)
  await user.type(screen.getByRole('textbox', { name: 'Pitch title' }), ' changed')
  await user.click(screen.getByRole('button', { name: 'Load sample' }))
  expect(screen.getByRole('dialog', { name: 'Replace changed working content?' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toHaveValue(
    `${sample.title} changed`,
  )
  await user.click(screen.getByRole('button', { name: 'Clear working copy' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear working copy' }),
  )
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toHaveValue('')
  expect(bodyEditor().getJSON()).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
  await user.click(screen.getByRole('button', { name: 'Delete test snapshot' }))
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
})

it('requires replacement confirmation and never reports successful saving on quota failure', async () => {
  renderWithProviders(<WritingCanvasSpike />)
  const user = await loadAndSave()
  const raw = window.localStorage.getItem(SNAPSHOT_KEY)
  await user.type(screen.getByRole('textbox', { name: 'Pitch title' }), ' changed')
  await user.click(screen.getByRole('button', { name: 'Save test snapshot' }))
  expect(screen.getByRole('dialog', { name: 'Replace the saved test snapshot?' })).toBeVisible()
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  await user.click(screen.getByRole('button', { name: 'Replace test snapshot' }))
  expect(screen.getByRole('status')).toHaveTextContent('Test snapshot was not saved.')
  expect(screen.getByRole('status')).not.toHaveTextContent('Test snapshot saved in this browser')
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
})

it('reloads title and full document in a fresh editor, and restores again after remount', async () => {
  const render = renderWithProviders(<WritingCanvasSpike />)
  const user = await loadAndSave()
  const saved = parseSnapshot(window.localStorage.getItem(SNAPSHOT_KEY)!)
  const original = bodyEditor()
  act(() => {
    original.commands.insertContent('Unsaved words. ')
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Pitch title' }), {
    target: { value: 'Unsaved title' },
  })
  await user.click(screen.getByRole('button', { name: 'Reload test snapshot' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Reload test snapshot' }),
  )
  expect(bodyEditor()).not.toBe(original)
  expect(bodyEditor().getJSON()).toEqual(saved.document)
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toHaveValue(saved.title)
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  render.unmount()
  renderWithProviders(<WritingCanvasSpike />)
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toHaveValue('')
  await user.click(screen.getByRole('button', { name: 'Reload test snapshot' }))
  expect(bodyEditor().getJSON()).toEqual(saved.document)
  expect(screen.getByRole('textbox', { name: 'Pitch title' })).toHaveValue(saved.title)
})

it('previews saved content while keeping unsaved writing mounted, and clone edits leave the saved bytes unchanged', async () => {
  renderWithProviders(<WritingCanvasSpike />)
  const user = await loadAndSave()
  const before = window.localStorage.getItem(SNAPSHOT_KEY)!
  const saved = parseSnapshot(before)
  const original = bodyEditor()
  act(() => {
    original.commands.insertContent('Unsaved opening. ')
  })
  const unsaved = original.getJSON()
  await user.click(screen.getByRole('button', { name: 'Read-only preview' }))
  const preview = screen.getByRole('document', { name: 'Saved snapshot body' }) as HTMLElement & {
    editor: Editor
  }
  expect(preview).toHaveAttribute('contenteditable', 'false')
  expect(preview.editor.getJSON()).toEqual(saved.document)
  expect(screen.queryByRole('combobox', { name: 'Paragraph style' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Write' }))
  expect(bodyEditor()).toBe(original)
  expect(bodyEditor().getJSON()).toEqual(unsaved)
  await user.click(screen.getByRole('button', { name: 'Clone snapshot to working copy' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Clone snapshot to working copy',
    }),
  )
  expect(bodyEditor()).not.toBe(original)
  expect(bodyEditor().getJSON()).toEqual(saved.document)
  act(() => {
    bodyEditor().commands.insertContent('Copy-only edit. ')
  })
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(before)
})

it('shows invalid stored text escaped, preserves it, and disables preview and reload', async () => {
  const raw = '<script>unsafe example</script>'
  window.localStorage.setItem(SNAPSHOT_KEY, raw)
  renderWithProviders(<WritingCanvasSpike />)
  expect(screen.getByText(/invalid or incompatible/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Read-only preview' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Reload test snapshot' })).toBeDisabled()
  await userEvent.setup().click(screen.getByText('Inspect saved JSON'))
  expect(screen.getByText(raw)).toBeVisible()
  expect(document.querySelector('pre script')).toBeNull()
  expect(window.localStorage.getItem(SNAPSHOT_KEY)).toBe(raw)
})

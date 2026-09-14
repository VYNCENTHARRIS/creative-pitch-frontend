import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

// Snapshot previews also reject document-changing commands and keyboard shortcuts.
export const ReadOnlyGuard = Extension.create({
  name: 'snapshotReadOnly',
  addProseMirrorPlugins() {
    return [new Plugin({ filterTransaction: (transaction) => !transaction.docChanged })]
  },
})

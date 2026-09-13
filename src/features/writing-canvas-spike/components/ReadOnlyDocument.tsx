import { RichTextEditor } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import { documentExtensions, ReadOnlyGuard } from '../editor'
import type { TestSnapshot } from '../types'
import classes from '../WritingCanvas.module.css'

export function ReadOnlyDocument({ snapshot }: { snapshot: TestSnapshot }) {
  const editor = useEditor({
    extensions: [...documentExtensions(), ReadOnlyGuard],
    content: snapshot.document,
    editable: false,
    enableContentCheck: true,
    editorProps: {
      attributes: { role: 'document', 'aria-label': 'Saved snapshot body', tabindex: '0' },
    },
  })
  return (
    <RichTextEditor editor={editor} withTypographyStyles={false} className={classes.paper}>
      <article className={classes.document} aria-label="Saved test snapshot">
        <h2 className={classes.previewTitle}>{snapshot.title || 'Untitled pitch'}</h2>
        <RichTextEditor.Content className={classes.body} />
      </article>
    </RichTextEditor>
  )
}

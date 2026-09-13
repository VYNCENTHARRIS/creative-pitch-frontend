import { NativeSelect, Textarea } from '@mantine/core'
import { RichTextEditor } from '@mantine/tiptap'
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconUnlink,
} from '@tabler/icons-react'
import { useEditor } from '@tiptap/react'
import { useImperativeHandle, useState, type Ref } from 'react'
import { documentExtensions } from '../editor'
import type { WorkingDocument } from '../types'
import classes from '../WritingCanvas.module.css'
import { LinkControl } from './LinkControl'

export interface WritingCanvasHandle {
  read: () => WorkingDocument
}

interface WritingCanvasProps {
  initial: WorkingDocument
  onChange: () => void
  ref: Ref<WritingCanvasHandle>
}

export function WritingCanvas({ initial, onChange, ref }: WritingCanvasProps) {
  const [title, setTitle] = useState(initial.title)
  const editor = useEditor({
    extensions: documentExtensions(),
    content: initial.document,
    enableContentCheck: true,
    shouldRerenderOnTransaction: true,
    onUpdate: onChange,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Pitch body', 'aria-multiline': 'true' },
      handleDOMEvents: {
        click: (_view, event) => {
          if (event.target instanceof Element && event.target.closest('a')) {
            event.preventDefault()
          }
          return false
        },
      },
    },
  })
  useImperativeHandle(
    ref,
    () => ({
      read: () => ({ title, document: editor ? editor.getJSON() : initial.document }),
    }),
    [editor, initial.document, title],
  )

  const level = [1, 2, 3].find((value) => editor?.isActive('heading', { level: value }))

  return (
    <RichTextEditor
      editor={editor}
      withTypographyStyles={false}
      className={classes.paper}
      classNames={{ control: classes.control, controlsGroup: classes.controlsGroup }}
    >
      <RichTextEditor.Toolbar
        sticky
        stickyOffset="var(--app-shell-header-offset, 76px)"
        className={classes.toolbar}
        aria-label="Document formatting"
      >
        <NativeSelect
          aria-label="Paragraph style"
          value={level ? String(level) : 'paragraph'}
          data={[
            { value: 'paragraph', label: 'Paragraph' },
            { value: '1', label: 'Heading 1' },
            { value: '2', label: 'Heading 2' },
            { value: '3', label: 'Heading 3' },
          ]}
          className={classes.styleSelect}
          onChange={(event) => {
            const value = event.currentTarget.value
            if (value === 'paragraph') editor?.chain().focus().setParagraph().run()
            else if (value === '1' || value === '2' || value === '3') {
              editor
                ?.chain()
                .focus()
                .setHeading({ level: Number(value) as 1 | 2 | 3 })
                .run()
            }
          }}
        />
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold icon={IconBold} />
          <RichTextEditor.Italic icon={IconItalic} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList icon={IconList} />
          <RichTextEditor.OrderedList icon={IconListNumbers} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          {editor && <LinkControl editor={editor} />}
          <RichTextEditor.Unlink icon={IconUnlink} disabled={!editor?.isActive('link')} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo icon={IconArrowBackUp} />
          <RichTextEditor.Redo icon={IconArrowForwardUp} />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <div className={classes.document}>
        <Textarea
          aria-label="Pitch title"
          placeholder="Untitled pitch"
          value={title}
          onChange={(event) => {
            setTitle(event.currentTarget.value)
            onChange()
          }}
          autosize
          minRows={1}
          variant="unstyled"
          classNames={{ input: classes.titleInput }}
        />
        <RichTextEditor.Content className={classes.body} />
      </div>
    </RichTextEditor>
  )
}

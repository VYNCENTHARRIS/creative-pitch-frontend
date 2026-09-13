import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { RichTextEditor } from '@mantine/tiptap'
import { IconLink } from '@tabler/icons-react'
import type { Editor } from '@tiptap/core'
import { useState } from 'react'
import { isSafeLink } from '../editor'

export function LinkControl({ editor }: { editor: Editor }) {
  const [opened, setOpened] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const open = () => {
    const href: unknown = editor.getAttributes('link').href
    setUrl(typeof href === 'string' ? href : '')
    setError(null)
    setOpened(true)
  }
  useWindowEvent('edit-link', () => {
    if (editor.isFocused && editor.isEditable) open()
  })
  const close = () => setOpened(false)

  return (
    <>
      <RichTextEditor.Control
        aria-label="Add or edit link"
        title="Add or edit link"
        active={editor.isActive('link')}
        onClick={open}
      >
        <IconLink size={18} aria-hidden="true" />
      </RichTextEditor.Control>
      <Modal
        opened={opened}
        onClose={close}
        title="Add or edit link"
        returnFocus={false}
        onExitTransitionEnd={() => editor.commands.focus()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSafeLink(url)) {
              setError('Enter a complete http:// or https:// address.')
              return
            }
            const applied = editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run()
            if (applied) close()
            else setError('This link could not be applied. Select some text and try again.')
          }}
        >
          <Stack>
            <TextInput
              label="Link URL"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.currentTarget.value)}
              error={error}
              data-autofocus
            />
            <Text size="sm" c="dimmed">
              Links open in a new tab in the saved preview. Select text first, or place the cursor
              inside an existing link.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">Apply link</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}

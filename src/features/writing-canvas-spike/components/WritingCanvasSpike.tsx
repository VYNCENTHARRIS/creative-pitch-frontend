import '@mantine/tiptap/styles.css'
import { Badge, Button, Group, Modal, Stack, Text, Title } from '@mantine/core'
import { IconCopy, IconEye, IconPencil, IconRefresh, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { emptyDocument, validateDocument } from '../editor'
import { sample } from '../sample'
import {
  copySnapshot,
  deleteSnapshot,
  readSnapshot,
  sameDocument,
  saveSnapshot,
  SNAPSHOT_KEY,
} from '../snapshots'
import type { WorkingDocument } from '../types'
import classes from '../WritingCanvas.module.css'
import { ReadOnlyDocument } from './ReadOnlyDocument'
import { WritingCanvas, type WritingCanvasHandle } from './WritingCanvas'

interface Confirmation {
  title: string
  description: string
  label: string
  action: () => void
}

const blank = (): WorkingDocument => ({ title: '', document: emptyDocument() })

export function WritingCanvasSpike() {
  const [working, setWorking] = useState(() => ({ initial: blank(), generation: 0, copied: false }))
  const canvas = useRef<WritingCanvasHandle>(null)
  const baseline = useRef<WorkingDocument>(working.initial)
  const [changed, setChanged] = useState(false)
  const [stored, setStored] = useState(readSnapshot)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === SNAPSHOT_KEY || event.key === null) setStored(readSnapshot())
    }
    window.addEventListener('storage', update)
    return () => window.removeEventListener('storage', update)
  }, [])

  function current() {
    return canvas.current?.read() ?? working.initial
  }

  function replaceWorking(next: WorkingDocument, copied = false, unsavedSample = false) {
    const initial = { title: next.title, document: validateDocument(next.document) }
    baseline.current = unsavedSample ? blank() : structuredClone(initial)
    // Reset the editor here so reloading does not keep the previous undo history.
    setWorking((previous) => ({ initial, generation: previous.generation + 1, copied }))
    setChanged(unsavedSample)
    setPreview(false)
  }

  function afterDiscardConfirmation(action: () => void, label: string) {
    if (!sameDocument(current(), baseline.current)) {
      setConfirmation({
        title: 'Replace changed working content?',
        description: `Your unsaved title and body changes will be discarded. ${label} starts a fresh editor with empty undo history.`,
        label,
        action,
      })
    } else action()
  }

  function refreshStored() {
    const result = readSnapshot()
    setStored(result)
    return result
  }

  function save() {
    const document = current()
    const existing = refreshStored()
    if (existing.status === 'unavailable') {
      setMessage('Test snapshot was not saved. Browser storage is unavailable.')
      return
    }
    const perform = () => {
      const result = saveSnapshot(document, existing.raw)
      if (result.status === 'valid') {
        setStored(result)
        baseline.current = copySnapshot(result.snapshot)
        setChanged(false)
        setMessage('Test snapshot saved in this browser')
      } else if (result.status === 'unavailable') setMessage(result.message)
    }
    if (
      existing.raw !== null &&
      (existing.status !== 'valid' || !sameDocument(document, existing.snapshot))
    ) {
      setConfirmation({
        title: 'Replace the saved test snapshot?',
        description:
          'This browser holds one test snapshot. Saving will replace its existing title and document, including any incompatible stored content.',
        label: 'Replace test snapshot',
        action: perform,
      })
    } else perform()
  }

  function restore(copy: boolean) {
    const result = refreshStored()
    if (result.status !== 'valid') return
    const label = copy ? 'Clone snapshot to working copy' : 'Reload test snapshot'
    afterDiscardConfirmation(() => {
      replaceWorking(copySnapshot(result.snapshot), copy)
      setMessage(
        copy
          ? 'Editable copy created. The saved snapshot is unchanged.'
          : 'Test snapshot reloaded into a fresh working copy.',
      )
    }, label)
  }

  const validSnapshot = stored.status === 'valid' ? stored.snapshot : null
  const showingPreview = preview && validSnapshot !== null

  return (
    <div className={classes.root}>
      <Stack gap="sm" mb="lg">
        <Group justify="space-between">
          <Title order={1} size="h3">
            Writing Canvas Spike
          </Title>
          <Badge color="gray">Design preview</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Development spike. Test snapshots stay in this browser and are not saved to Creative
          Pitch. Only saved test snapshots survive a page refresh. Use sample content, not
          confidential pitches.
        </Text>
      </Stack>

      <Group justify="space-between" mb="md" gap="sm">
        <Group gap="xs">
          <Button
            size="sm"
            variant={!showingPreview ? 'light' : 'subtle'}
            leftSection={<IconPencil size={16} />}
            aria-pressed={!showingPreview}
            onClick={() => setPreview(false)}
          >
            Write
          </Button>
          <Button
            size="sm"
            variant={showingPreview ? 'light' : 'subtle'}
            leftSection={<IconEye size={16} />}
            disabled={!validSnapshot}
            aria-pressed={showingPreview}
            onClick={() => {
              const result = refreshStored()
              setPreview(result.status === 'valid')
            }}
          >
            Read-only preview
          </Button>
        </Group>
        {!showingPreview && (
          <Button
            size="sm"
            variant="default"
            onClick={() =>
              afterDiscardConfirmation(() => {
                replaceWorking(structuredClone(sample), false, true)
                setMessage('Synthetic sample loaded. Nothing was saved.')
              }, 'Load sample')
            }
          >
            Load sample
          </Button>
        )}
      </Group>

      <Text size="sm" c="dimmed" mb="sm">
        {showingPreview
          ? 'Saved test snapshot · Read-only. Your working copy is kept separately.'
          : `${working.copied ? 'Copy of saved test snapshot' : 'Working copy'} · ${changed ? 'Unsaved changes' : 'Ready to write'}`}
      </Text>
      <div hidden={showingPreview}>
        <WritingCanvas
          key={working.generation}
          ref={canvas}
          initial={working.initial}
          onChange={() => setChanged(true)}
        />
      </div>
      {showingPreview && <ReadOnlyDocument key={stored.raw} snapshot={validSnapshot} />}

      <section className={classes.tools} aria-labelledby="snapshot-heading">
        <Stack gap="md">
          <div>
            <Title order={2} size="h4" id="snapshot-heading">
              Test snapshot
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              {stored.status === 'valid'
                ? `One snapshot in this browser · Saved ${new Date(stored.snapshot.savedAt).toLocaleString()}`
                : stored.status === 'empty'
                  ? 'No test snapshot in this browser yet.'
                  : stored.message}
            </Text>
          </div>
          <Group gap="sm">
            <Button size="sm" onClick={save} disabled={showingPreview}>
              Save test snapshot
            </Button>
            <Button
              size="sm"
              variant="default"
              leftSection={<IconRefresh size={16} />}
              disabled={!validSnapshot}
              onClick={() => restore(false)}
            >
              Reload test snapshot
            </Button>
            <Button
              size="sm"
              variant="default"
              leftSection={<IconCopy size={16} />}
              disabled={!validSnapshot}
              onClick={() => restore(true)}
            >
              Clone snapshot to working copy
            </Button>
          </Group>
          <Group gap="sm">
            <Button
              size="sm"
              variant="subtle"
              disabled={showingPreview}
              onClick={() =>
                setConfirmation({
                  title: 'Clear the working copy?',
                  description:
                    'The current title and body will be cleared. Your saved test snapshot will stay in this browser.',
                  label: 'Clear working copy',
                  action: () => {
                    replaceWorking(blank())
                    setMessage('Working copy cleared. The saved test snapshot is unchanged.')
                  },
                })
              }
            >
              Clear working copy
            </Button>
            <Button
              size="sm"
              variant="subtle"
              leftSection={<IconTrash size={16} />}
              disabled={stored.raw === null}
              onClick={() => {
                const existing = refreshStored()
                if (existing.raw === null) return
                const raw = existing.raw
                setConfirmation({
                  title: 'Delete the test snapshot?',
                  description:
                    'Only this spike’s saved test snapshot will be removed from this browser. Your working copy and unrelated browser storage will stay.',
                  label: 'Delete test snapshot',
                  action: () => {
                    const error = deleteSnapshot(raw)
                    if (error) setMessage(error)
                    else {
                      setStored(readSnapshot())
                      setPreview(false)
                      setMessage('Test snapshot deleted. Working copy kept.')
                    }
                  },
                })
              }}
            >
              Delete test snapshot
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                refreshStored()
                setMessage('Browser snapshot checked.')
              }}
            >
              Check browser storage
            </Button>
          </Group>
          <Text size="sm" role="status" aria-live="polite">
            {message}
          </Text>
          <details>
            <summary>Inspect saved JSON</summary>
            <Text size="xs" c="dimmed" mt="xs">
              Actual stored envelope. This does not include unsaved working changes.
            </Text>
            <pre className={classes.json}>
              {stored.status === 'valid'
                ? JSON.stringify(JSON.parse(stored.raw), null, 2)
                : (stored.raw ?? 'No saved JSON available.')}
            </pre>
          </details>
        </Stack>
      </section>

      <Modal
        opened={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title}
      >
        <Text size="sm">{confirmation?.description}</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" data-autofocus onClick={() => setConfirmation(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const action = confirmation?.action
              setConfirmation(null)
              action?.()
            }}
          >
            {confirmation?.label}
          </Button>
        </Group>
      </Modal>
    </div>
  )
}

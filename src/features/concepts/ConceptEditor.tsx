import { Alert, Anchor, Button, Group, Modal, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconDeviceFloppy, IconLock } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../shared/api/ApiError'
import { apiErrorMessage } from '../../shared/api/client'
import { useUnsavedWork } from '../../shared/ui/navigationContext'
import { AccessPanel, useAuth } from '../auth'
import { DraftBuffer } from './draftBuffer'
import { sameDraft } from './content'
import { editableDocument } from './editor/schema'
import { WritingCanvas } from './editor/WritingCanvas'
import type { WritingCanvasHandle } from './editor/WritingCanvas'
import type { ConceptDetail } from './types'
import { conceptKeys, privateQueryOptions, useConceptApi } from './queries'
import classes from './Concepts.module.css'

export function ConceptEditor({ conceptId }: { conceptId?: string }) {
  const location = useLocation()
  const [promotion, setPromotion] = useState<{ id: string; key: string } | null>(null)
  const entryKey =
    promotion && conceptId === promotion.id && location.state?.creationKey === promotion.key
      ? promotion.key
      : location.key
  return (
    <EditorEntry
      key={entryKey}
      conceptId={conceptId}
      onCreated={(id) => setPromotion({ id, key: entryKey })}
      creationKey={entryKey}
    />
  )
}

function EditorEntry({
  conceptId,
  onCreated,
  creationKey,
}: {
  conceptId?: string
  onCreated: (id: string) => void
  creationKey: string
}) {
  const { api, scope, meta } = useConceptApi()
  const auth = useAuth()
  const load = useMemo(
    () =>
      ({ signal }: { signal: AbortSignal }) =>
        api.detail(conceptId ?? '', signal),
    [api, conceptId],
  )
  const query = useQuery({
    ...privateQueryOptions,
    queryKey: conceptKeys.detail(scope, conceptId ?? 'new'),
    queryFn: load,
    enabled: !!conceptId && auth.status === 'authenticated',
    meta,
    refetchOnMount: 'always',
  })
  const { suspend } = auth
  useEffect(() => {
    suspend(query.error)
  }, [query.error, suspend])
  // Keep this mounted during first-save URL replacement and background refreshes.
  const [opened, setOpened] = useState<ConceptDetail | null | undefined>(
    conceptId ? undefined : null,
  )
  if (opened === undefined && query.isSuccess && !query.isFetching) {
    setOpened(query.data)
  }
  if (opened !== undefined) {
    try {
      editableDocument(opened?.draft.written_content ?? { type: 'doc' })
    } catch {
      return (
        <Alert title="This draft cannot be edited with the current editor" color="red" role="alert">
          The stored document has been preserved. Saving is disabled.{' '}
          <Anchor component={Link} to="/concepts">
            Return to My Concepts
          </Anchor>
        </Alert>
      )
    }
    return <WorkingDraft initial={opened} onCreated={onCreated} creationKey={creationKey} />
  }
  if (auth.status !== 'authenticated') return <AccessPanel />
  if (query.isError)
    return (
      <Alert
        color="red"
        title={
          query.error instanceof ApiError && query.error.status === 404
            ? 'Concept unavailable'
            : 'Could not load the draft'
        }
        role="alert"
      >
        <Text>{apiErrorMessage(query.error)}</Text>
        <Button
          mt="md"
          onClick={() => {
            void query.refetch()
          }}
        >
          Retry
        </Button>
      </Alert>
    )
  return <Text role="status">Loading working draft…</Text>
}

function WorkingDraft({
  initial,
  onCreated,
  creationKey,
}: {
  initial: ConceptDetail | null
  onCreated: (id: string) => void
  creationKey: string
}) {
  const auth = useAuth()
  const { api, scope, meta } = useConceptApi()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [buffer] = useState(() => new DraftBuffer(initial))
  const [recoveryEmail] = useState(
    () => auth.controller.getSnapshot().session?.user.email ?? auth.profile?.email,
  )
  const state = useSyncExternalStore(buffer.subscribe, buffer.getSnapshot)
  const [retryConfirmation, setRetryConfirmation] = useState(false)
  const canvas = useRef<WritingCanvasHandle>(null)
  const active = useRef(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      pending.current?.abort()
    }
  }, [])
  const check = useMemo(() => ({ dirty: buffer.needsWarning, allows: buffer.allows }), [buffer])
  useUnsavedWork(check, buffer.needsWarning())
  const { mutateAsync } = useMutation({
    mutationFn: api.save,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    meta,
  })
  async function save() {
    if (auth.status !== 'authenticated') return
    const snapshot = buffer.begin()
    if (!snapshot) return
    const controller = new AbortController()
    pending.current = controller
    try {
      const response = await mutateAsync({ ...snapshot, signal: controller.signal })
      if (!active.current || !auth.controller.isCurrent(scope)) return
      if (!sameDraft(snapshot.input, response.draft))
        throw new ApiError('The saved document could not be verified.', null, 'invalid_response')
      buffer.confirm(response)
      queryClient.setQueryData(conceptKeys.detail(scope, response.id), response)
      // List refresh is independent of the confirmed draft write.
      void queryClient
        .invalidateQueries({ queryKey: conceptKeys.mine(scope) })
        .catch(() => undefined)
      if (!snapshot.id) {
        onCreated(response.id)
        await navigate(`/concepts/${response.id}`, { replace: true, state: { creationKey } })
        buffer.transitionDone()
      }
    } catch (error) {
      if (!active.current || !auth.controller.isCurrent(scope)) return
      const ambiguous =
        !snapshot.id &&
        (!(error instanceof ApiError) || error.status === null || error.status >= 500)
      buffer.fail(error, ambiguous)
      auth.suspend(error)
    } finally {
      pending.current = null
    }
  }
  const status = state.saving
    ? 'Saving…'
    : state.error
      ? 'Save failed'
      : !state.id
        ? 'Not saved yet'
        : buffer.dirty()
          ? 'Unsaved changes'
          : 'Saved'
  const initialCanvas = useMemo(
    () => ({
      title: initial?.draft.title ?? '',
      document: editableDocument(initial?.draft.written_content ?? { type: 'doc' }),
    }),
    [initial],
  )
  return (
    <div className={classes.workspace}>
      <Group gap="xs" mb="md" className={classes.breadcrumb}>
        <Anchor component={Link} to="/concepts">
          My Concepts
        </Anchor>
        <Text aria-hidden="true">/</Text>
        <Text size="sm">{state.working.title || 'Untitled concept'}</Text>
      </Group>
      <Title order={1} size="h2" c="var(--heading)" mb="md">
        {state.id ? 'Working draft' : 'New Concept'}
      </Title>
      <div className={classes.actionBar}>
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Stack gap={2}>
            <Group gap={6}>
              <IconLock size={15} aria-hidden="true" />
              <Text size="sm" fw={600}>
                Working draft · Private
              </Text>
            </Group>
            <Text size="sm" role="status" aria-live="polite">
              {status}
            </Text>
          </Stack>
          <Button
            className={classes.saveButton}
            leftSection={<IconDeviceFloppy size={18} aria-hidden="true" />}
            loading={state.saving}
            disabled={auth.status !== 'authenticated'}
            onClick={() => {
              if (state.ambiguous) setRetryConfirmation(true)
              else void save()
            }}
          >
            Save Draft
          </Button>
        </Group>
        {state.savedAt && (
          <Text size="xs" c="dimmed" mt={6}>
            Last confirmed save{' '}
            <time dateTime={state.savedAt}>{new Date(state.savedAt).toLocaleString()}</time>
          </Text>
        )}
      </div>
      <Text size="sm" c="dimmed" mb="lg">
        Save your current work privately. This does not submit it for review.
      </Text>
      {auth.status !== 'authenticated' && <AccessPanel recovery expectedEmail={recoveryEmail} />}
      {state.error != null && (
        <Alert color="red" role="alert" mb="md">
          {apiErrorMessage(state.error)}
          {state.ambiguous && (
            <Stack gap="xs" mt="sm">
              <Text size="sm">
                Creation could not be confirmed. A Concept may already have been created. Check My
                Concepts before trying again; another create could produce a duplicate.
              </Text>
              <Anchor component={Link} to="/concepts" target="_blank" rel="noopener noreferrer">
                Check My Concepts before retrying
              </Anchor>
              <Text size="xs">Opens in a new tab so this working copy stays here.</Text>
            </Stack>
          )}
        </Alert>
      )}
      {state.errors.document && (
        <Alert color="red" role="alert" mb="md">
          {state.errors.document}
        </Alert>
      )}
      <div className={classes.editor}>
        <WritingCanvas
          ref={canvas}
          initial={initialCanvas}
          titleError={state.errors.title}
          onChange={(next) => buffer.change({ title: next.title, written_content: next.document })}
        >
          <TextInput
            className={classes.category}
            label="Category (optional)"
            value={state.working.category ?? ''}
            onChange={(event) => buffer.change({ category: event.currentTarget.value })}
            error={state.errors.category}
          />
        </WritingCanvas>
      </div>
      <Modal
        opened={retryConfirmation}
        onClose={() => setRetryConfirmation(false)}
        title="Retry creating this Concept?"
        centered
      >
        <Text>
          The previous create may have succeeded. Trying again can create a duplicate. Check My
          Concepts first.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" data-autofocus onClick={() => setRetryConfirmation(false)}>
            Keep editing
          </Button>
          <Button
            onClick={() => {
              setRetryConfirmation(false)
              void save()
            }}
          >
            Create again
          </Button>
        </Group>
      </Modal>
    </div>
  )
}

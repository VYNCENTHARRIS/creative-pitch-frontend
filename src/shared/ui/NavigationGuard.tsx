import { Button, Group, Modal, Text } from '@mantine/core'
import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { NavigationContext, type LeaveCheck } from './navigationContext'

export function NavigationGuard({ children }: PropsWithChildren) {
  const check = useRef<LeaveCheck | null>(null)
  const [action, setAction] = useState<(() => void) | null>(null)
  const [warning, setWarning] = useState(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname &&
      !!check.current?.dirty() &&
      !check.current.allows(nextLocation.pathname),
  )
  const value = useMemo(
    () => ({
      register: (next: LeaveCheck) => {
        check.current = next
        setWarning(next.dirty())
        return () => {
          if (check.current === next) {
            check.current = null
            setWarning(false)
          }
        }
      },
      confirmAction: (next: () => void) => {
        if (check.current?.dirty()) setAction(() => next)
        else next()
      },
    }),
    [],
  )
  const close = () => {
    setAction(null)
    if (blocker.state === 'blocked') blocker.reset()
  }
  return (
    <NavigationContext.Provider value={value}>
      {children}
      {warning && <BeforeUnloadWarning />}
      <Modal
        opened={action !== null || blocker.state === 'blocked'}
        onClose={close}
        title="Unsaved changes"
        centered
      >
        <Text>You have unsaved changes. Leave without saving?</Text>
        <Text size="sm" c="dimmed" mt="sm">
          Only changes in this tab will be discarded. A save already in progress may still finish.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" data-autofocus onClick={close}>
            Keep editing
          </Button>
          <Button
            onClick={() => {
              const next = action
              setAction(null)
              if (next) next()
              else if (blocker.state === 'blocked') blocker.proceed()
            }}
          >
            Leave without saving
          </Button>
        </Group>
      </Modal>
    </NavigationContext.Provider>
  )
}

function BeforeUnloadWarning() {
  useBeforeUnload(
    useCallback((event) => {
      event.preventDefault()
      event.returnValue = ''
    }, []),
  )
  return null
}

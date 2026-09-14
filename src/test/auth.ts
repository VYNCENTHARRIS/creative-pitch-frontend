import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { vi } from 'vitest'
import { SessionController, type AuthClient } from '../features/auth'

export const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
export const CONCEPT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
export function fakeSession(id = USER_A, token = 'fabricated-access-a'): Session {
  return {
    access_token: token,
    refresh_token: 'fabricated-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id,
      email: id === USER_A ? 'writer@example.test' : 'second@example.test',
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: { role: 'admin' },
      created_at: '2026-09-13T12:00:00Z',
    },
  }
}
export const profile = (id = USER_A) => ({
  id,
  email: id === USER_A ? 'writer@example.test' : 'second@example.test',
  display_name: id === USER_A ? 'Test Writer' : 'Second Writer',
  role: 'writer',
})

export function authHarness(initial: Session | null = null) {
  let session = initial
  const callbacks = new Set<(event: AuthChangeEvent, session: Session | null) => void>()
  const emit = (
    next: Session | null,
    event: AuthChangeEvent = next ? 'SIGNED_IN' : 'SIGNED_OUT',
  ) => {
    session = next
    callbacks.forEach((callback) => callback(event, next))
  }
  const unsubscribe = vi.fn()
  const client = {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        callbacks.add(callback)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                callbacks.delete(callback)
                unsubscribe()
              },
            },
          },
        }
      },
    ),
    signInWithPassword: vi.fn(async () => {
      const next = fakeSession()
      emit(next)
      return { data: { session: next, user: next.user }, error: null }
    }),
    signOut: vi.fn(async () => {
      emit(null)
      return { error: null }
    }),
  }
  return {
    controller: new SessionController(client as unknown as AuthClient),
    client,
    emit,
    unsubscribe,
    callbacks,
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

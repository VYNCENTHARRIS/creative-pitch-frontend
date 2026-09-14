import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '../../shared/api/ApiError'
import type { RequestAccess } from '../../shared/api/client'
import { env } from '../../shared/config/env'

export type AuthClient = Pick<
  SupabaseClient['auth'],
  'getSession' | 'onAuthStateChange' | 'signInWithPassword' | 'signOut'
>
export interface IdentityScope {
  userId: string
  epoch: number
}
interface SessionState {
  session: Session | null
  identityId: string | null
  epoch: number
  phase: 'checking' | 'ready' | 'unavailable'
}

export class SessionController {
  private state: SessionState = { session: null, identityId: null, epoch: 0, phase: 'checking' }
  private listeners = new Set<() => void>()
  constructor(private auth: AuthClient) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private update(state: SessionState) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }
  private accept(session: Session | null) {
    const identityId = session?.user.id ?? this.state.identityId
    this.update({
      session,
      identityId,
      phase: 'ready',
      epoch: this.state.epoch + Number(identityId !== this.state.identityId),
    })
  }
  start = () => {
    let active = true
    let events = 0
    const {
      data: { subscription },
    } = this.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      events++
      this.accept(session)
    })
    const initialEvents = events
    void this.auth
      .getSession()
      .then(({ data, error }) => {
        // A later auth event wins over an older session-restoration result.
        if (!active || events !== initialEvents) return
        if (error) this.update({ ...this.state, phase: 'unavailable' })
        else this.accept(data.session)
      })
      .catch(() => {
        if (active && events === initialEvents) this.update({ ...this.state, phase: 'unavailable' })
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }
  retrySession = async () => {
    const before = this.state
    try {
      const { data, error } = await this.auth.getSession()
      if (this.state !== before) return
      if (error) throw error
      this.accept(data.session)
    } catch {
      if (this.state === before) this.update({ ...this.state, phase: 'unavailable' })
    }
  }
  signIn = async (email: string, password: string) => {
    const { error } = await this.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  signOut = async () => {
    const epoch = this.state.epoch
    const { error } = await this.auth.signOut({ scope: 'local' })
    if (error) throw new Error('Sign out failed. Your session may still be active. Please retry.')
    const { data, error: checkError } = await this.auth.getSession()
    if (checkError || data.session || this.state.epoch !== epoch)
      throw new Error('Sign out could not be confirmed. Please retry.')
    this.update({ session: null, identityId: null, epoch: this.state.epoch + 1, phase: 'ready' })
  }
  isCurrent = (scope: IdentityScope) =>
    this.state.identityId === scope.userId && this.state.epoch === scope.epoch
  access = (scope: IdentityScope): RequestAccess => ({
    assertCurrent: () => {
      if (!this.isCurrent(scope)) throw new DOMException('Account changed', 'AbortError')
      if (this.state.session?.user.id !== scope.userId)
        throw new ApiError('Authentication required.', 401, 'authentication_required')
    },
    token: () => {
      if (!this.isCurrent(scope)) throw new DOMException('Account changed', 'AbortError')
      if (this.state.session?.user.id !== scope.userId)
        throw new ApiError('Authentication required.', 401, 'authentication_required')
      return this.state.session.access_token
    },
  })
}

const hotData = import.meta.hot?.data as { sessionController?: SessionController } | undefined
let browserSession = hotData?.sessionController
export function getBrowserSession(): SessionController {
  if (!browserSession) {
    const client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.any([
              AbortSignal.timeout(12000),
              ...(init?.signal ? [init.signal] : []),
            ]),
          }),
      },
    })
    browserSession = new SessionController(client.auth)
    if (hotData) hotData.sessionController = browserSession
  }
  return browserSession
}

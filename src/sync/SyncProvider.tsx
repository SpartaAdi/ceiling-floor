import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useStore } from '../store/AppStore'
import { syncOnce } from './engine'
import { SYNC_CONFIG, syncConfigured } from './config'
import type { Cloud } from './supabase'

export type SyncState = 'off' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

interface SyncApi {
  configured: boolean
  state: SyncState
  user: User | null
  lastSyncedAt: number | null
  error: string | null
  cloud: Cloud | null
  syncNow: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

const Ctx = createContext<SyncApi | null>(null)

const PUSH_DEBOUNCE_MS = 1500
const POLL_MS = 60_000

export function SyncProvider({ children }: { children: ReactNode }) {
  const { data, ready, applyRemote } = useStore()
  const configured = syncConfigured()
  const [cloud, setCloud] = useState<Cloud | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<SyncState>(configured ? 'signed-out' : 'off')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dataRef = useRef(data)
  dataRef.current = data
  const running = useRef(false)
  const again = useRef(false)

  // Load the Supabase client only when sync is configured
  useEffect(() => {
    if (!configured) return
    let off = () => {}
    let alive = true
    void import('./supabase').then(async ({ createCloud }) => {
      if (!alive) return
      const c = createCloud(SYNC_CONFIG.url, SYNC_CONFIG.anonKey)
      setCloud(c)
      setUser(await c.currentUser())
      off = c.onAuthChange(setUser)
    })
    return () => {
      alive = false
      off()
    }
  }, [configured])

  const syncNow = useCallback(async () => {
    if (!cloud || !user || !ready) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    setState('syncing')
    try {
      do {
        again.current = false
        const r = await syncOnce(dataRef.current, cloud.remoteFor(user))
        if (r.changedLocal) applyRemote(r.merged)
      } while (again.current)
      setError(null)
      setLastSyncedAt(Date.now())
      setState('synced')
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine
      setError(offline ? null : e instanceof Error ? e.message : 'Sync failed')
      setState(offline ? 'offline' : 'error')
    } finally {
      running.current = false
    }
  }, [cloud, user, ready, applyRemote])

  useEffect(() => {
    if (configured && !user) setState('signed-out')
  }, [configured, user])

  // Sync on sign-in, on resume, when back online, on a slow poll, and on realtime events
  useEffect(() => {
    if (!cloud || !user || !ready) return
    void syncNow()
    const onVisible = () => document.visibilityState === 'visible' && void syncNow()
    const onOnline = () => void syncNow()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    const poll = window.setInterval(() => document.visibilityState === 'visible' && void syncNow(), POLL_MS)
    const unsub = cloud.subscribe(user, () => void syncNow())
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.clearInterval(poll)
      unsub()
    }
  }, [cloud, user, ready, syncNow])

  // Push local edits shortly after they happen
  const first = useRef(true)
  useEffect(() => {
    if (!cloud || !user || !ready) return
    if (first.current) {
      first.current = false
      return
    }
    const t = window.setTimeout(() => void syncNow(), PUSH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [data, cloud, user, ready, syncNow])

  const api = useMemo<SyncApi>(
    () => ({
      configured,
      state,
      user,
      lastSyncedAt,
      error,
      cloud,
      syncNow,
      signIn: async (email, password) => {
        if (!cloud) throw new Error('Sync is still loading • Try again')
        await cloud.signIn(email, password)
      },
      signUp: async (email, password) => {
        if (!cloud) throw new Error('Sync is still loading • Try again')
        return cloud.signUp(email, password)
      },
      signOut: async () => {
        await cloud?.signOut()
        setLastSyncedAt(null)
      },
    }),
    [configured, state, user, lastSyncedAt, error, cloud, syncNow],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useSync() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSync must be used inside SyncProvider')
  return s
}

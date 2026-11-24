import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { AppData, Reminders } from '../types'
import type { RemoteStore } from './engine'

/**
 * Thin wrapper over Supabase: auth, the single `app_state` row per user,
 * realtime change events and push-subscription rows. Loaded lazily so the
 * app stays small when sync isn't configured.
 */
export function createCloud(url: string, anonKey: string) {
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'cfm:auth' },
  })

  const remoteFor = (user: User): RemoteStore => ({
    async pull() {
      const { data, error } = await client.from('app_state').select('data').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      return data?.data ?? null
    },
    async push(d: AppData) {
      const { error } = await client.from('app_state').upsert({ user_id: user.id, data: d, updated_at: new Date().toISOString() })
      if (error) throw error
    },
  })

  return {
    async currentUser() {
      const { data } = await client.auth.getSession()
      return data.session?.user ?? null
    },
    onAuthChange(cb: (u: User | null) => void) {
      const { data } = client.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null))
      return () => data.subscription.unsubscribe()
    },
    async signIn(email: string, password: string) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email: string, password: string) {
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) throw error
      return { needsConfirmation: !data.session }
    },
    async signOut() {
      await client.auth.signOut()
    },
    remoteFor,
    /** Calls `cb` whenever the user's row changes (any device). */
    subscribe(user: User, cb: () => void) {
      const channel = client
        .channel(`app_state:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state', filter: `user_id=eq.${user.id}` }, () => cb())
        .subscribe()
      return () => void client.removeChannel(channel)
    },
    async savePushSubscription(user: User, sub: PushSubscriptionJSON, reminders: Reminders) {
      const { error } = await client.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          morning: reminders.morning,
          evening: reminders.evening,
          enabled: true,
          user_agent: navigator.userAgent.slice(0, 200),
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw error
    },
    async updateReminderTimes(user: User, reminders: Reminders) {
      const { error } = await client
        .from('push_subscriptions')
        .update({ morning: reminders.morning, evening: reminders.evening, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
        .eq('user_id', user.id)
      if (error) throw error
    },
    async deletePushSubscription(endpoint: string) {
      const { error } = await client.from('push_subscriptions').delete().eq('endpoint', endpoint)
      if (error) throw error
    },
    /** Ask the server to send a test notification to this account's devices. */
    async sendTest() {
      const { data, error } = await client.functions.invoke('send-reminders', { body: { test: true } })
      if (error) throw error
      return data as { sent: number }
    },
  }
}

export type Cloud = ReturnType<typeof createCloud>

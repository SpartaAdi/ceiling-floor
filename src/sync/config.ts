/** Sync + reminders turn on only when the deployment provides these (see SETUP-SYNC.md). */
export const SYNC_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL?.trim() || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '',
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() || '',
}

export const syncConfigured = () => !!(SYNC_CONFIG.url && SYNC_CONFIG.anonKey)
export const pushConfigured = () => syncConfigured() && !!SYNC_CONFIG.vapidPublicKey

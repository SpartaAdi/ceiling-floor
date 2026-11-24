/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xyz.supabase.co (public) */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon / publishable key — designed to be public; access is enforced by row-level security */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Web Push VAPID public key (public) */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

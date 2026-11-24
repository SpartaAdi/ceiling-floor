// Supabase Edge Function (Deno). Sends the twice-daily reminders via Web Push.
//  • Cron (every 5 min, header x-cron-secret) → sends due morning/evening reminders
//  • Signed-in user, body { test: true }        → sends a test to that user's devices
// Deploy:  npx supabase functions deploy send-reminders --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { dueReminders, reminderMessage, type DayLite, type ReminderSub } from '../_shared/reminders.ts'

const env = (k: string) => Deno.env.get(k) ?? ''
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:reminders@example.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Row = ReminderSub & { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

async function send(row: Row, payload: unknown) {
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 3600 })
    return true
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode
    if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', row.id) // expired
    else console.error('push failed', code, (e as Error).message)
    return false
  }
}

async function todayFor(userId: string, date: string): Promise<DayLite | null> {
  const { data } = await admin.from('app_state').select('data').eq('user_id', userId).maybeSingle()
  return (data?.data?.days?.[date] as DayLite | undefined) ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const body = await req.json().catch(() => ({}))

  // Test notification for the signed-in user
  if (body?.test) {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = await admin.auth.getUser(token)
    if (!auth?.user) return json({ error: 'unauthorized' }, 401)
    const { data: rows } = await admin.from('push_subscriptions').select('*').eq('user_id', auth.user.id).eq('enabled', true)
    let sent = 0
    for (const r of (rows ?? []) as Row[]) if (await send(r, reminderMessage('test'))) sent++
    return json({ sent })
  }

  // Scheduled run
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'forbidden' }, 403)
  const now = new Date()
  const { data: rows, error } = await admin.from('push_subscriptions').select('*').eq('enabled', true)
  if (error) return json({ error: error.message }, 500)
  let sent = 0
  for (const r of (rows ?? []) as Row[]) {
    for (const { kind, date } of dueReminders(r, now)) {
      const ok = await send(r, reminderMessage(kind, await todayFor(r.user_id, date)))
      // Mark as handled either way so a broken endpoint isn't retried every 5 minutes
      await admin.from('push_subscriptions').update(kind === 'morning' ? { last_morning: date } : { last_evening: date }).eq('id', r.id)
      if (ok) sent++
    }
  }
  return json({ checked: rows?.length ?? 0, sent })
})

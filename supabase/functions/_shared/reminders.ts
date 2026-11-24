/**
 * Pure reminder logic shared by the server function (Deno) and unit tests (Vitest).
 * No imports, no I/O.
 */

export type ReminderKind = 'morning' | 'evening'

export interface ReminderSub {
  tz: string
  morning: string // HH:MM local
  evening: string // HH:MM local
  last_morning: string | null // YYYY-MM-DD local date last sent
  last_evening: string | null
}

/** Minimal shape of a logged day used to personalise the text. */
export interface DayLite {
  mode?: 'ceiling' | 'floor' | 'miss'
  plan?: 'ceiling' | 'floor' | 'miss'
  statuses?: Record<string, string>
  blocks?: unknown[]
  reflection?: Record<string, string | undefined>
}

/** Send within this many minutes after the chosen time (cron runs every 5 min). */
export const SEND_WINDOW_MIN = 90

export function localNow(now: Date, tz: string): { date: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  } catch {
    return localNow(now, 'Asia/Kolkata')
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Which reminders are due right now for this subscription (at most once per local day each). */
export function dueReminders(sub: ReminderSub, now: Date): { kind: ReminderKind; date: string }[] {
  const { date, minutes } = localNow(now, sub.tz || 'Asia/Kolkata')
  const out: { kind: ReminderKind; date: string }[] = []
  for (const kind of ['morning', 'evening'] as const) {
    const at = toMin(sub[kind] || (kind === 'morning' ? '09:30' : '21:00'))
    const last = kind === 'morning' ? sub.last_morning : sub.last_evening
    if (minutes >= at && minutes < at + SEND_WINDOW_MIN && last !== date) out.push({ kind, date })
  }
  return out
}

const LABEL = { ceiling: 'Ceiling', floor: 'Floor', miss: 'Miss' } as const

/** Notification text. Kept short and generic: it shows on the lock screen. */
export function reminderMessage(kind: ReminderKind | 'test', day?: DayLite | null) {
  if (kind === 'test') return { title: 'Reminders are on ✅', body: 'You will get a nudge each morning and evening', tag: 'test', url: '/' }
  if (kind === 'morning') {
    const plan = day?.mode ?? day?.plan
    return {
      title: 'Good morning ☀️',
      body: plan ? `Today is a ${LABEL[plan]} day • Tick your morning blocks` : "Pick today's mode • Tick your morning blocks",
      tag: 'morning',
      url: '/',
    }
  }
  if (!day?.mode) return { title: 'Update what you did today 🌙', body: "Pick today's mode • Tick your blocks • Check-in", tag: 'evening', url: '/' }
  const reflected = Object.values(day.reflection ?? {}).some(Boolean)
  return {
    title: 'Update what you did today 🌙',
    body: reflected ? 'Mark any misses • Plan tomorrow' : 'Mark any misses • Write your check-in',
    tag: 'evening',
    url: '/',
  }
}

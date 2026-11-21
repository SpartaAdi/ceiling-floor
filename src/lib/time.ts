import type { DayMode, DayType, TemplateKey } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local-date key YYYY-MM-DD (never UTC). */
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (key: string, n: number) => {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Monday of the week containing `key`. */
export const weekStartOf = (key: string) => {
  const d = fromKey(key)
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow)
  return toKey(d)
}

export const weekDays = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

export const isWeekend = (key: string) => {
  const dow = fromKey(key).getDay()
  return dow === 0 || dow === 6
}

export const dayTypeOf = (key: string): DayType => (isWeekend(key) ? 'weekend' : 'weekday')

export const templateFor = (key: string, mode: DayMode): TemplateKey => {
  const t = dayTypeOf(key)
  return mode === 'floor' ? `${t}-floor` : `${t}-ceiling`
}

/** Minutes since midnight. "23:59" is treated as end of day (1440). */
export const toMin = (hhmm: string, isEnd = false) => {
  const [h, m] = hhmm.split(':').map(Number)
  const v = h * 60 + m
  return isEnd && v >= 1439 ? 1440 : v
}

export const nowMin = (d: Date) => d.getHours() * 60 + d.getMinutes()

/** 24h "HH:MM" → 12h parts. End-of-day "23:59" shows as 12:00 AM (midnight). */
export function to12(hhmm: string, isEnd = false) {
  let [h, m] = hhmm.split(':').map(Number)
  if (isEnd && h === 23 && m === 59) {
    h = 0
    m = 0
  }
  return { time: `${h % 12 === 0 ? 12 : h % 12}:${pad(m)}`, period: h < 12 ? 'AM' : 'PM' }
}

/** "21:30" → "9:30 PM" */
export const fmt12 = (hhmm: string, isEnd = false) => {
  const t = to12(hhmm, isEnd)
  return `${t.time} ${t.period}`
}

/** Device clock as 12-hour text, e.g. "9:05 PM" */
export const fmtTime = (d: Date) => fmt12(`${pad(d.getHours())}:${pad(d.getMinutes())}`)

export const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DOW_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const dowIndex = (key: string) => (fromKey(key).getDay() + 6) % 7

export const fmtLong = (key: string) =>
  fromKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export const fmtMonth = (key: string) =>
  fromKey(key).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export const durationLabel = (start: string, end: string) => {
  const mins = toMin(end, true) - toMin(start)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

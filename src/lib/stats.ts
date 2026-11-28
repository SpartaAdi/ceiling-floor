import type { AppData, DayLog, DayMode, Targets, WeekHealth } from '../types'
import { addDays, fromKey, toKey, weekDays, weekStartOf } from './time'

/* ---------- Day helpers ---------- */

export const blockScore = (day?: DayLog) => {
  if (!day || !day.blocks.length) return { done: 0, total: 0 }
  const done = day.blocks.filter((b) => effectiveStatus(day, b.id) === 'completed').length
  return { done, total: day.blocks.length }
}

/**
 * Status of a block. Nothing is assumed done: an unticked block counts as not
 * completed, and once the day is over it shows as missed.
 */
export const effectiveStatus = (day: DayLog, blockId: string) => {
  const s = day.statuses[blockId]
  if (s) return s
  if (day.mode === 'miss' || day.date < toKey(new Date())) return 'missed'
  return undefined
}

/* ---------- Weekly budget ---------- */

export const classifyWeek = (ceiling: number, miss: number, t: Targets): WeekHealth => {
  if (ceiling >= t.ceiling && miss <= t.miss) return 'green'
  const amberMin = Math.max(0, t.ceiling - 2)
  if (ceiling >= amberMin && miss <= t.miss + 1) return 'amber'
  return 'red'
}

export interface WeekSummary {
  weekStart: string
  days: { key: string; mode?: DayMode; plan?: DayMode; future: boolean; isToday: boolean }[]
  ceiling: number
  floor: number
  miss: number
  logged: number
  /** Open days (today or later, not yet logged) */
  remaining: number
  /** Open days that already have a plan */
  planned: { ceiling: number; floor: number; miss: number }
  floorLeft: number
  /** Actual classification of what is logged so far */
  actual: WeekHealth
  /** Best achievable outcome: plans as planned, every unplanned open day Ceiling */
  projected: WeekHealth
  forecast: string
}

export function summarizeWeek(data: AppData, weekStart: string, todayKey: string): WeekSummary {
  const t = data.settings.targets
  const days = weekDays(weekStart).map((key) => ({
    key,
    mode: data.days[key]?.mode,
    plan: data.days[key]?.mode ? undefined : data.days[key]?.plan,
    future: key > todayKey,
    isToday: key === todayKey,
  }))
  const count = (m: DayMode) => days.filter((d) => d.mode === m).length
  const ceiling = count('ceiling')
  const floor = count('floor')
  const miss = count('miss')
  const logged = ceiling + floor + miss
  const open = days.filter((d) => !d.mode && d.key >= todayKey)
  const remaining = open.length
  const planned = {
    ceiling: open.filter((d) => d.plan === 'ceiling').length,
    floor: open.filter((d) => d.plan === 'floor').length,
    miss: open.filter((d) => d.plan === 'miss').length,
  }
  const unplanned = open.filter((d) => !d.plan).length
  const floorLeft = t.floor - floor
  const actual = classifyWeek(ceiling, miss, t)
  const projected = classifyWeek(ceiling + planned.ceiling + unplanned, miss + planned.miss, t)
  return {
    weekStart,
    days,
    ceiling,
    floor,
    miss,
    logged,
    remaining,
    planned,
    floorLeft,
    actual,
    projected,
    forecast: forecastLine({
      ceiling: ceiling + planned.ceiling,
      miss: miss + planned.miss,
      remaining: unplanned,
      closed: remaining === 0,
      floorLeft: floorLeft - planned.floor,
      t,
      projected,
    }),
  }
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

function forecastLine(p: {
  ceiling: number
  miss: number
  remaining: number
  closed: boolean
  floorLeft: number
  t: Targets
  projected: WeekHealth
}) {
  const { ceiling, miss, remaining, floorLeft, t } = p
  const needGreen = Math.max(0, t.ceiling - ceiling)
  const needAmber = Math.max(0, t.ceiling - 2 - ceiling)

  if (p.closed) {
    return p.projected === 'green' ? 'Week closed • Green 🎉' : `Week closed • ${HEALTH_META[p.projected].label}`
  }
  if (remaining === 0) return `Plan → ${HEALTH_META[p.projected].label} • Stick to it`
  if (miss >= t.miss + 2) return 'Red locked • Finish strong'
  if (miss > t.miss) {
    if (needAmber === 0) return 'Amber secured • No more Miss'
    if (needAmber > remaining) return 'Red week • Reset Monday'
    return `${plural(needAmber, 'more Ceiling day')} for Amber`
  }
  if (needGreen === 0) return 'Green secured • Avoid a Miss'
  if (needGreen > remaining) {
    if (needAmber === 0) return 'Green out of reach • Hold Amber'
    if (needAmber > remaining) return 'Red week • Reset Monday'
    return `${plural(needAmber, 'more Ceiling day')} for Amber`
  }
  if (floorLeft <= 0 || needGreen === remaining) return `${Math.max(0, floorLeft)} Floors left • Hold Ceiling`
  return `${plural(needGreen, 'more Ceiling day')} for Green`
}

export const HEALTH_META: Record<WeekHealth, { label: string; emoji: string; text: string; bg: string }> = {
  green: { label: 'Green Week', emoji: '🟢', text: 'text-ceiling-ink', bg: 'bg-ceiling/10' },
  amber: { label: 'Amber Week', emoji: '🟡', text: 'text-floor-ink', bg: 'bg-floor/10' },
  red: { label: 'Red Week', emoji: '🔴', text: 'text-miss-ink', bg: 'bg-miss/10' },
}

/* ---------- Timeframes ---------- */

export type Timeframe = 'week' | 'month' | '30d' | 'all'

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  week: 'This Week',
  month: 'This Month',
  '30d': '30 Days',
  all: 'All Time',
}

export function rangeFor(tf: Timeframe, data: AppData, todayKey: string): [string, string] {
  if (tf === 'week') return [weekStartOf(todayKey), todayKey]
  if (tf === 'month') return [todayKey.slice(0, 8) + '01', todayKey]
  if (tf === '30d') return [addDays(todayKey, -29), todayKey]
  const keys = Object.keys(data.days).sort()
  return [keys[0] && keys[0] < todayKey ? keys[0] : todayKey, todayKey]
}

export const daysInRange = (data: AppData, [from, to]: [string, string]) =>
  Object.values(data.days)
    .filter((d) => d.date >= from && d.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))

export function breakdown(days: DayLog[]) {
  const logged = days.filter((d) => d.mode)
  const n = logged.length
  const c = (m: DayMode) => logged.filter((d) => d.mode === m).length
  const ceiling = c('ceiling')
  const floor = c('floor')
  const miss = c('miss')
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : 0)
  return { total: n, ceiling, floor, miss, pCeiling: pct(ceiling), pFloor: pct(floor), pMiss: pct(miss) }
}

/* ---------- Streaks & weeks ---------- */

export function nonMissStreak(data: AppData, todayKey: string) {
  let key = data.days[todayKey]?.mode ? todayKey : addDays(todayKey, -1)
  let current = 0
  while (true) {
    const m = data.days[key]?.mode
    if (!m || m === 'miss') break
    current++
    key = addDays(key, -1)
  }
  // Best streak across all history
  const keys = Object.keys(data.days)
    .filter((k) => data.days[k].mode)
    .sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const k of keys) {
    const m = data.days[k].mode
    const contiguous = prev && addDays(prev, 1) === k
    if (m === 'miss') run = 0
    else run = contiguous ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return { current, best: Math.max(best, current) }
}

export function greenWeeks(data: AppData, todayKey: string) {
  const starts = new Set(
    Object.values(data.days)
      .filter((d) => d.mode)
      .map((d) => weekStartOf(d.date)),
  )
  let green = 0
  let total = 0
  for (const ws of starts) {
    const s = summarizeWeek(data, ws, todayKey)
    const done = s.remaining === 0
    if (done) total++
    if (s.actual === 'green') green++
  }
  return { green, total }
}

/* ---------- Block performance ---------- */

export interface BlockStat {
  title: string
  done: number
  total: number
  pct: number
}

export function blockReport(days: DayLog[]): BlockStat[] {
  const map = new Map<string, BlockStat>()
  for (const day of days) {
    if (day.mode !== 'ceiling' && day.mode !== 'floor') continue
    for (const b of day.blocks) {
      const key = b.title.trim()
      const s = map.get(key) ?? { title: key, done: 0, total: 0, pct: 0 }
      s.total++
      if (effectiveStatus(day, b.id) === 'completed') s.done++
      map.set(key, s)
    }
  }
  return [...map.values()].map((s) => ({ ...s, pct: Math.round((s.done / s.total) * 100) }))
}

/** Ignore one-off blocks once there is enough history, so a single slip doesn't dominate. */
const sampled = (stats: BlockStat[]) => {
  const minN = stats.some((s) => s.total >= 3) ? 3 : 1
  return stats.filter((s) => s.total >= minN)
}

export const strongest = (stats: BlockStat[]) =>
  sampled(stats)
    .sort((a, b) => b.pct - a.pct || b.total - a.total)
    .slice(0, 3)

export const weakest = (stats: BlockStat[]) =>
  sampled(stats)
    .filter((s) => s.done < s.total)
    .sort((a, b) => a.pct - b.pct || b.total - b.done - (a.total - a.done))
    .slice(0, 3)

/* ---------- Habits ---------- */

export function habitWeek(data: AppData, weekStart: string, todayKey: string) {
  const keys = weekDays(weekStart)
  const elapsed = keys.filter((k) => k <= todayKey)
  const daily = data.habits
    .filter((h) => h.kind === 'daily')
    .map((h) => {
      const cells = keys.map((k) => ({ key: k, future: k > todayKey, done: !!data.days[k]?.habits[h.id] }))
      const done = cells.filter((c) => !c.future && c.done).length
      return { habit: h, cells, done, pct: elapsed.length ? Math.round((done / elapsed.length) * 100) : 0 }
    })
  const weekly = data.habits
    .filter((h) => h.kind === 'weekly')
    .map((h) => ({ habit: h, doneOn: data.weeks[weekStart]?.care[h.id] }))
  return { keys, daily, weekly }
}

/* ---------- Calendar ---------- */

export function monthGrid(monthKey: string) {
  // monthKey: any date inside the month
  const first = fromKey(monthKey.slice(0, 8) + '01')
  const lead = (first.getDay() + 6) % 7
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= last; d++) cells.push(toKey(new Date(first.getFullYear(), first.getMonth(), d)))
  while (cells.length % 7) cells.push(null)
  return cells
}

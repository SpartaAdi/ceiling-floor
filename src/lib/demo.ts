import type { AppData, BlockStatus, DayLog, DayMode } from '../types'
import { addDays, fromKey, templateFor, weekStartOf } from './time'

/** Small seeded PRNG so demo data is stable per load. */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Blocks that tend to slip — makes the Block Report interesting.
const FRAGILE: Record<string, number> = {
  'Morning Reset': 0.3,
  'Yoga & Mind': 0.2,
  'Evening Sitting': 0.35,
  Reading: 0.3,
  'Deep Block #2': 0.3,
  'Gym Prep': 0.1,
}
const MISS_REASONS = ['Sick', 'Travel', 'Late night', 'Low energy']

/** Returns a copy of `data` with 14 past days (ending yesterday) of demo logs. */
export function withDemoData(data: AppData, todayKey: string): AppData {
  const rand = mulberry32(Number(todayKey.replace(/-/g, '')))
  const next: AppData = structuredClone(data)

  for (let i = 14; i >= 1; i--) {
    const key = addDays(todayKey, -i)
    const r = rand()
    const mode: DayMode = r < 0.6 ? 'ceiling' : r < 0.86 ? 'floor' : 'miss'
    const tk = templateFor(key, mode)
    const blocks = structuredClone(next.templates[tk])
    const statuses: Record<string, BlockStatus> = {}
    for (const b of blocks) {
      if (mode === 'miss') statuses[b.id] = rand() < 0.25 ? 'completed' : 'missed'
      else statuses[b.id] = rand() < (FRAGILE[b.title] ?? 0.04) ? 'missed' : 'completed'
    }
    const habits: Record<string, boolean> = {
      meds: rand() < 0.92,
      triphala: rand() < 0.7,
      steam: rand() < 0.6,
      brush: rand() < 0.96,
    }
    const day: DayLog = {
      date: key,
      mode,
      template: tk,
      blocks,
      statuses,
      habits,
      updatedAt: fromKey(key).getTime(),
      demo: true,
      ...(mode === 'miss' ? { missReason: MISS_REASONS[Math.floor(rand() * MISS_REASONS.length)] } : {}),
    }
    next.days[key] = day

    // Weekend care: scrub on Saturday, oiling on Sunday (mostly)
    const dow = fromKey(key).getDay()
    const ws = weekStartOf(key)
    const week = (next.weeks[ws] ??= { weekStart: ws, care: {} })
    if (dow === 6 && rand() < 0.8) week.care.besan = key
    if (dow === 0 && rand() < 0.7) week.care.oiling = key
  }
  next.settings.demoLoaded = true
  return next
}

export function withoutDemoData(data: AppData): AppData {
  const next: AppData = structuredClone(data)
  for (const [k, d] of Object.entries(next.days)) if (d.demo) delete next.days[k]
  next.settings.demoLoaded = false
  return next
}

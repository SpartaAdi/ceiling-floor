import type { AppData, BlockStatus, DayLog, DayMode } from '../types'
import { addDays, fromKey, templateFor, weekStartOf } from './time'

export const DEMO_DAYS = 42

/** Small seeded PRNG so demo data is stable per load. */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const MISS_REASONS = ['Late night', 'Travel', 'Sick', 'Late night', 'Work crunch']
const WINS = ['Shipped GoML module', 'Gym PR on squats', 'Read 40 pages', 'Calm, focused morning', 'Long park walk with Bunny']
const LESSONS = ['Phone out of bedroom', 'Prep gym bag at night', 'Start sitting before email', 'Eat dinner by 6']
const FOCUS = ['Deep Block before noon', 'Gym, no excuses', 'Finish chapter 4', 'Lights out at 10', 'Speech practice']

/** Returns a copy of `data` with 6 weeks of demo logs ending yesterday, with visible trends. */
export function withDemoData(data: AppData, todayKey: string): AppData {
  const rand = mulberry32(Number(todayKey.replace(/-/g, '')))
  const next: AppData = structuredClone(data)
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]

  for (let i = DEMO_DAYS; i >= 1; i--) {
    const key = addDays(todayKey, -i)
    const progress = (DEMO_DAYS - i) / DEMO_DAYS // 0 → 1 over time: improving trend
    const weekend = [0, 6].includes(fromKey(key).getDay())
    const r = rand()
    const ceilP = 0.45 + progress * 0.25 - (weekend ? 0.15 : 0)
    const mode: DayMode = r < ceilP ? 'ceiling' : r < 0.88 ? 'floor' : 'miss'
    const tk = templateFor(key, mode)
    const blocks = structuredClone(next.templates[tk])
    // Per-category slip chance: deep work improves, reading slips over time
    const slip = (cat: string, title: string) => {
      if (cat === 'deep') return 0.35 - progress * 0.25
      if (cat === 'learning') return 0.15 + progress * 0.35
      if (cat === 'fitness') return weekend ? 0.3 : 0.12
      if (cat === 'mind') return 0.25
      if (title === 'Sleep') return 0.3 - progress * 0.15
      return 0.05
    }
    const statuses: Record<string, BlockStatus> = {}
    for (const b of blocks) {
      if (mode === 'miss') statuses[b.id] = rand() < 0.25 ? 'completed' : 'missed'
      else statuses[b.id] = rand() < slip(b.category, b.title) ? 'missed' : 'completed'
    }
    const habits: Record<string, boolean> = {
      meds: rand() < 0.92,
      triphala: rand() < 0.65,
      steam: rand() < 0.55,
      brush: rand() < 0.96,
      eatright: rand() < (mode === 'ceiling' ? 0.8 : 0.45),
    }
    const energyBase = mode === 'ceiling' ? 4 : mode === 'floor' ? 3 : 2
    const energy = Math.max(1, Math.min(5, energyBase + (rand() < 0.3 ? -1 : rand() < 0.3 ? 1 : 0)))
    const day: DayLog = {
      date: key,
      mode,
      template: tk,
      blocks,
      statuses,
      habits,
      energy,
      updatedAt: fromKey(key).getTime(),
      demo: true,
      ...(rand() < 0.6 ? { reflection: { win: pick(WINS), lesson: rand() < 0.5 ? pick(LESSONS) : undefined, focus: pick(FOCUS) } } : {}),
      ...(mode === 'miss' ? { missReason: pick(MISS_REASONS) } : {}),
    }
    next.days[key] = day

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

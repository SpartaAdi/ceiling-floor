import type { AppData, BlockStatus, DayMode } from '../../types'
import { createDefaultData } from '../../data/defaults'
import { applyDayMode, ensureDay } from '../dayLogic'

export const fresh = (): AppData => createDefaultData()

/** Log a day with a mode, optional per-block overrides (by title) and habits. */
export function logDay(
  d: AppData,
  date: string,
  mode: DayMode,
  opts: { set?: Record<string, BlockStatus>; habits?: string[]; energy?: number; win?: string; reason?: string } = {},
) {
  applyDayMode(d, date, mode)
  const day = d.days[date]
  for (const [title, st] of Object.entries(opts.set ?? {})) {
    const b = day.blocks.find((x) => x.title === title)
    if (!b) throw new Error(`No block "${title}" on ${date}`)
    day.statuses[b.id] = st
  }
  for (const h of opts.habits ?? []) day.habits[h] = true
  if (opts.energy) day.energy = opts.energy
  if (opts.win) day.reflection = { win: opts.win }
  if (opts.reason) day.missReason = opts.reason
  return day
}

export const habitsOnly = (d: AppData, date: string, habits: string[]) => {
  const day = ensureDay(d, date)
  for (const h of habits) day.habits[h] = true
}

// Fixed calendar anchors (Nov 2026): 16 = Monday, 21 = Saturday, 22 = Sunday
export const MON = '2026-11-16'
export const TUE = '2026-11-17'
export const WED = '2026-11-18'
export const THU = '2026-11-19'
export const FRI = '2026-11-20'
export const SAT = '2026-11-21'
export const SUN = '2026-11-22'

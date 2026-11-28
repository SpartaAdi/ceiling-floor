import type { AppData, BlockStatus, DayLog, DayMode } from '../types'
import { templateFor } from './time'

/** Pure mutations on a draft AppData. The store clones before calling these. */

export const ensureDay = (d: AppData, date: string): DayLog =>
  (d.days[date] ??= { date, blocks: [], statuses: {}, habits: {}, updatedAt: Date.now() })

/** Snapshot the Ceiling preview so pre-mode (catch-up) logs have blocks to attach to. */
export function ensureSnapshot(d: AppData, date: string): DayLog {
  const day = ensureDay(d, date)
  if (!day.blocks.length) {
    const tk = templateFor(date, 'ceiling')
    day.blocks = structuredClone(d.templates[tk])
    day.template = tk
  }
  return day
}

/**
 * Set a day mode: snapshot that mode's template. Blocks start unticked
 * (not done until you tick them — or use "All ✓"); a Miss day marks them ✕.
 * Ticks made before any mode was picked are kept when they were made
 * against the same template.
 */
export function applyDayMode(d: AppData, date: string, mode: DayMode) {
  const day = ensureDay(d, date)
  const tk = templateFor(date, mode)
  const keep = !day.mode && day.template === tk ? day.statuses : {}
  day.blocks = structuredClone(d.templates[tk])
  day.template = tk
  day.mode = mode
  day.statuses = {}
  for (const b of day.blocks) {
    const s: BlockStatus | undefined = keep[b.id] ?? (mode === 'miss' ? 'missed' : undefined)
    if (s) day.statuses[b.id] = s
  }
  if (mode !== 'miss') delete day.missReason
  day.updatedAt = Date.now()
}

export function resetDayLog(d: AppData, date: string) {
  const day = d.days[date]
  if (!day) return
  day.mode = undefined
  day.template = undefined
  day.blocks = []
  day.statuses = {}
  delete day.missReason
  delete day.plan // otherwise today's plan would re-apply immediately
  day.updatedAt = Date.now()
}

/** Plan (or clear) a mode for a future day without logging anything. */
export function setDayPlan(d: AppData, date: string, mode: DayMode | undefined) {
  const day = ensureDay(d, date)
  if (mode) day.plan = mode
  else delete day.plan
  day.updatedAt = Date.now()
}

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
 * Set a day mode: snapshot that mode's template and auto-tick every block
 * (✓ for Ceiling/Floor, ✕ for Miss). Catch-up logs made before any mode was
 * picked are kept when they were made against the same template.
 */
export function applyDayMode(d: AppData, date: string, mode: DayMode) {
  const day = ensureDay(d, date)
  const tk = templateFor(date, mode)
  const keep = !day.mode && day.template === tk ? day.statuses : {}
  day.blocks = structuredClone(d.templates[tk])
  day.template = tk
  day.mode = mode
  const fill: BlockStatus = mode === 'miss' ? 'missed' : 'completed'
  day.statuses = Object.fromEntries(day.blocks.map((b) => [b.id, keep[b.id] ?? fill]))
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
  day.updatedAt = Date.now()
}

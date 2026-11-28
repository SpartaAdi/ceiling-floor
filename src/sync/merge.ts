import type { AppData, DayLog, Settings, SyncMeta, WeekLog } from '../types'

/**
 * Cross-device merge, last-write-wins:
 *  • days and weeks merge one by one (newest `updatedAt` wins)
 *  • templates, habits, goals and settings merge as whole sections
 *  • deletions are remembered as tombstones so they don't come back
 *  • theme stays per device
 */

export const SECTIONS = ['templates', 'habits', 'goals', 'mealPlan', 'myFoods', 'settings'] as const
type Section = (typeof SECTIONS)[number]

/** Settings that are per-device and never synced */
const syncedSettings = (s: Settings) => {
  const { theme: _theme, demoLoaded: _demo, ...rest } = s
  return rest
}
const sectionValue = (d: AppData, k: Section) => (k === 'settings' ? syncedSettings(d.settings) : d[k])

/** JSON with sorted keys, so equal data always serialises the same way. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`
}

const emptyMeta = (): SyncMeta => ({ sections: {}, tombstones: {} })

/**
 * Record what changed between two versions of local data: stamps changed
 * days/weeks/sections with `now` and tombstones anything deleted. Mutates
 * and returns `next`.
 */
export function stampChanges(prev: AppData, next: AppData, now: number): AppData {
  const meta: SyncMeta = {
    sections: { ...prev.meta?.sections, ...next.meta?.sections },
    tombstones: { ...prev.meta?.tombstones, ...next.meta?.tombstones },
  }
  for (const k of SECTIONS) {
    if (stableStringify(sectionValue(prev, k)) !== stableStringify(sectionValue(next, k))) meta.sections[k] = now
  }
  for (const [key, day] of Object.entries(next.days)) {
    const p = prev.days[key]
    if (!p || p.updatedAt !== day.updatedAt) day.updatedAt = now
  }
  for (const key of Object.keys(prev.days)) if (!next.days[key]) meta.tombstones[`day:${key}`] = now
  for (const [key, week] of Object.entries(next.weeks)) {
    const p = prev.weeks[key]
    const strip = (w?: WeekLog) => (w ? stableStringify({ ...w, updatedAt: undefined }) : '')
    if (!p || strip(p) !== strip(week)) week.updatedAt = now
  }
  for (const key of Object.keys(prev.weeks)) if (!next.weeks[key]) meta.tombstones[`week:${key}`] = now
  next.meta = meta
  return next
}

function mergeMap<T extends { updatedAt?: number }>(
  a: Record<string, T>,
  b: Record<string, T>,
  prefix: string,
  tomb: Record<string, number>,
): Record<string, T> {
  const out: Record<string, T> = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key]
    const y = b[key]
    const pick = !x ? y : !y ? x : (y.updatedAt ?? 0) > (x.updatedAt ?? 0) ? y : x
    const dead = tomb[`${prefix}:${key}`]
    if (dead !== undefined && dead >= (pick.updatedAt ?? 0)) continue
    out[key] = pick
  }
  return out
}

/** Merge two copies of the data. `local` keeps its per-device settings. */
export function mergeData(local: AppData, remote: AppData): AppData {
  const lm = local.meta ?? emptyMeta()
  const rm = remote.meta ?? emptyMeta()
  const tombstones: Record<string, number> = { ...lm.tombstones }
  for (const [k, t] of Object.entries(rm.tombstones)) tombstones[k] = Math.max(tombstones[k] ?? 0, t)

  const sections: SyncMeta['sections'] = {}
  const pickSection = <K extends Section>(k: K): AppData[K] => {
    const lt = lm.sections[k] ?? 0
    const rt = rm.sections[k] ?? 0
    sections[k] = Math.max(lt, rt) || undefined
    if (!sections[k]) delete sections[k]
    return rt > lt ? remote[k] : local[k]
  }

  const settings = pickSection('settings')
  return {
    version: 2,
    templates: pickSection('templates'),
    habits: pickSection('habits'),
    goals: pickSection('goals'),
    mealPlan: pickSection('mealPlan'),
    myFoods: pickSection('myFoods'),
    settings: { ...settings, theme: local.settings.theme, demoLoaded: local.settings.demoLoaded },
    days: mergeMap<DayLog>(local.days, remote.days, 'day', tombstones),
    weeks: mergeMap<WeekLog>(local.weeks, remote.weeks, 'week', tombstones),
    meta: { sections, tombstones },
  }
}

/** True when two copies hold the same synced content (ignores per-device settings). */
export function sameSynced(a: AppData, b: AppData): boolean {
  const canon = (d: AppData) => ({ ...d, settings: syncedSettings(d.settings) })
  return stableStringify(canon(a)) === stableStringify(canon(b))
}

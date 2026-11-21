import type { AppData, DayLog, DayMode, FacetId } from '../types'
import { FACETS, FACET_BY_ID, GROWTH_FACETS, ADHERENCE_TARGET, blockMinutes, facetOfCategory, facetTargets, fmtH } from './facets'
import { blockReport, effectiveStatus, weakest, type Timeframe } from './stats'
import { DOW_SHORT, addDays, dowIndex, fromKey, toKey, weekDays, weekStartOf } from './time'

/* ---------- Facet stats ---------- */

export interface FacetStat {
  id: FacetId
  plannedMin: number
  doneMin: number
  hours: number
  blockPct: number | null
  habitPct: number | null
  habitDone: number
  habitPossible: number
  /** 0–100 execution score */
  score: number | null
}

const tracked = (d: DayLog) => !!d.mode || Object.values(d.habits).some(Boolean) || !!d.energy

export function computeFacets(data: AppData, days: DayLog[]): Record<FacetId, FacetStat> {
  const out = {} as Record<FacetId, FacetStat>
  for (const f of FACETS)
    out[f.id] = { id: f.id, plannedMin: 0, doneMin: 0, hours: 0, blockPct: null, habitPct: null, habitDone: 0, habitPossible: 0, score: null }

  for (const day of days) {
    for (const b of day.blocks) {
      const f = facetOfCategory(b.category)
      const status = effectiveStatus(day, b.id)
      if (!f || !status) continue
      const m = blockMinutes(b)
      out[f].plannedMin += m
      if (status === 'completed') out[f].doneMin += m
    }
  }

  const trackedDays = days.filter(tracked)
  for (const h of data.habits) {
    if (h.kind !== 'daily' || !h.facet) continue
    const s = out[h.facet]
    s.habitPossible += trackedDays.length
    s.habitDone += trackedDays.filter((d) => d.habits[h.id]).length
  }

  for (const s of Object.values(out)) {
    s.hours = s.doneMin / 60
    s.blockPct = s.plannedMin ? Math.round((s.doneMin / s.plannedMin) * 100) : null
    s.habitPct = s.habitPossible ? Math.round((s.habitDone / s.habitPossible) * 100) : null
    const parts = [s.blockPct, s.habitPct].filter((x): x is number => x !== null)
    s.score = FACET_BY_ID[s.id].metric === 'hours' ? s.blockPct : parts.length ? Math.round(parts.reduce((a, b) => a + b) / parts.length) : null
  }
  return out
}

export const lifeScore = (stats: Record<FacetId, FacetStat>) => {
  const scores = Object.values(stats)
    .map((s) => s.score)
    .filter((x): x is number => x !== null)
  return scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null
}

export const growthHours = (stats: Record<FacetId, FacetStat>) => GROWTH_FACETS.reduce((a, f) => a + stats[f.id].hours, 0)

/* ---------- Ranges ---------- */

export const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)

export function previousRange(tf: Timeframe, [from, to]: [string, string]): [string, string] | null {
  if (tf === 'all') return null
  if (tf === 'week') return [addDays(from, -7), addDays(to, -7)]
  if (tf === 'month') {
    const f = fromKey(from)
    const prevFirst = new Date(f.getFullYear(), f.getMonth() - 1, 1)
    const prevLast = new Date(f.getFullYear(), f.getMonth(), 0)
    const span = daysBetween(from, to)
    const end = new Date(prevFirst)
    end.setDate(Math.min(prevFirst.getDate() + span, prevLast.getDate()))
    return [toKey(prevFirst), toKey(end)]
  }
  const len = daysBetween(from, to) + 1
  return [addDays(from, -len), addDays(to, -len)]
}

export const logsIn = (data: AppData, [from, to]: [string, string]) =>
  Object.values(data.days).filter((d) => d.date >= from && d.date <= to)

/* ---------- Status per facet ---------- */

export type FacetStatus = 'on-track' | 'behind' | 'off-track' | 'no-data'

export function facetStatus(id: FacetId, s: FacetStat, rangeDays: number, data: AppData): { status: FacetStatus; expected?: number } {
  const def = FACET_BY_ID[id]
  if (def.metric === 'hours') {
    const expected = (facetTargets(data)[id] * rangeDays) / 7
    if (!s.plannedMin && !s.doneMin) return { status: 'no-data', expected }
    if (!expected) return { status: 'on-track', expected }
    const r = s.hours / expected
    return { status: r >= 0.9 ? 'on-track' : r >= 0.6 ? 'behind' : 'off-track', expected }
  }
  if (s.score === null) return { status: 'no-data' }
  return { status: s.score >= ADHERENCE_TARGET ? 'on-track' : s.score >= 60 ? 'behind' : 'off-track' }
}

/* ---------- Series ---------- */

export interface WeekPoint {
  weekStart: string
  label: string
  hours: Record<FacetId, number>
  score: Record<FacetId, number | null>
  growth: number
}

export function weeklySeries(data: AppData, todayKey: string, n = 8): WeekPoint[] {
  const current = weekStartOf(todayKey)
  return Array.from({ length: n }, (_, i) => {
    const ws = addDays(current, -7 * (n - 1 - i))
    const keys = new Set(weekDays(ws))
    const stats = computeFacets(data, Object.values(data.days).filter((d) => keys.has(d.date) && d.date <= todayKey))
    const hours = {} as Record<FacetId, number>
    const score = {} as Record<FacetId, number | null>
    for (const f of FACETS) {
      hours[f.id] = Math.round(stats[f.id].hours * 10) / 10
      score[f.id] = stats[f.id].score
    }
    return {
      weekStart: ws,
      label: fromKey(ws).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      hours,
      score,
      growth: Math.round(growthHours(stats) * 10) / 10,
    }
  })
}

export function weekdayProfile(days: DayLog[]) {
  const acc = DOW_SHORT.map((label) => ({ label, done: 0, planned: 0, days: 0 }))
  for (const d of days) {
    if (!d.mode) continue
    const row = acc[dowIndex(d.date)]
    row.days++
    for (const b of d.blocks) {
      if (b.category === 'rest') continue
      const m = blockMinutes(b)
      row.planned += m
      if (effectiveStatus(d, b.id) === 'completed') row.done += m
    }
  }
  return acc.map((r) => ({ label: r.label, days: r.days, pct: r.planned ? Math.round((r.done / r.planned) * 100) : null }))
}

export function modeComparison(data: AppData, days: DayLog[]) {
  const by = (m: DayMode) => {
    const list = days.filter((d) => d.mode === m)
    const growth = list.map((d) => growthHours(computeFacets(data, [d])))
    const energy = list.map((d) => d.energy).filter((e): e is number => !!e)
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y) / a.length : null)
    return { n: list.length, growth: avg(growth), energy: avg(energy), energyN: energy.length }
  }
  return { ceiling: by('ceiling'), floor: by('floor'), miss: by('miss') }
}

/* ---------- Insight generator ---------- */

export interface Insight {
  tone: 'good' | 'bad' | 'info'
  title: string
  sub: string
  weight: number
}

export function buildInsights(p: {
  data: AppData
  days: DayLog[]
  prevDays: DayLog[] | null
  rangeDays: number
}): Insight[] {
  const { data, days, prevDays, rangeDays } = p
  const out: Insight[] = []
  const cur = computeFacets(data, days)
  const prev = prevDays && prevDays.some((d) => d.mode) ? computeFacets(data, prevDays) : null
  const logged = days.filter((d) => d.mode).length

  // Too little data for trustworthy verdicts
  if (logged < 3) return [{ tone: 'info', title: 'Log a few more days', sub: `${logged}/3 days logged • Insights unlock at 3`, weight: 1 }]

  for (const f of FACETS) {
    const s = cur[f.id]
    const { status, expected } = facetStatus(f.id, s, rangeDays, data)
    if (status === 'no-data') continue
    if (f.metric === 'hours') {
      const delta = prev ? s.hours - prev[f.id].hours : 0
      if (prev && delta >= 1) out.push({ tone: 'good', title: `${f.label} up ${fmtH(delta)}`, sub: `${fmtH(s.hours)} vs ${fmtH(prev[f.id].hours)} • last period`, weight: delta })
      else if (prev && delta <= -1) out.push({ tone: 'bad', title: `${f.label} down ${fmtH(-delta)}`, sub: `${fmtH(s.hours)} vs ${fmtH(prev[f.id].hours)} • last period`, weight: -delta })
      else if (expected && status === 'off-track' && f.growth)
        out.push({ tone: 'bad', title: `${f.label} behind pace`, sub: `${fmtH(s.hours)} of ${fmtH(expected)} • ${fmtH(expected - s.hours)} short`, weight: expected - s.hours })
      else if (expected && status === 'on-track' && f.growth)
        out.push({ tone: 'good', title: `${f.label} on target`, sub: `${fmtH(s.hours)} of ${fmtH(expected)} pace`, weight: 0.5 })
    } else if (s.score !== null) {
      const habitBit = s.habitPossible ? ` • Habits ${s.habitDone}/${s.habitPossible}` : ''
      if (s.score < 65) out.push({ tone: 'bad', title: `${f.label} slipping`, sub: `${s.score}% kept${habitBit}`, weight: (80 - s.score) / 10 })
      else if (s.score >= 90) out.push({ tone: 'good', title: `${f.label} solid`, sub: `${s.score}% kept${habitBit}`, weight: (s.score - 80) / 10 })
    }
  }

  const mc = modeComparison(data, days)
  if (mc.ceiling.n >= 2 && mc.floor.n >= 2 && mc.ceiling.growth !== null && mc.floor.growth !== null) {
    const diff = mc.ceiling.growth - mc.floor.growth
    if (diff >= 0.5) out.push({ tone: 'info', title: `Floor days cost ${fmtH(diff)}`, sub: 'Growth hours • Ceiling vs Floor day', weight: 1.5 })
  }
  const others = [mc.floor, mc.miss].filter((x) => x.energy !== null)
  const otherN = others.reduce((a, x) => a + x.energyN, 0)
  if (mc.ceiling.energy !== null && mc.ceiling.energyN >= 3 && otherN >= 2) {
    const otherAvg = others.reduce((a, x) => a + (x.energy ?? 0) * x.energyN, 0) / otherN
    out.push({ tone: 'info', title: `Energy ${mc.ceiling.energy.toFixed(1)} on Ceiling days`, sub: `vs ${otherAvg.toFixed(1)} on other days`, weight: 1.2 })
  }

  const worst = weakest(blockReport(days))[0]
  if (worst && worst.pct < 80) out.push({ tone: 'bad', title: `Bottleneck • ${worst.title}`, sub: `${worst.pct}% done • ${worst.total - worst.done} misses`, weight: (100 - worst.pct) / 15 })

  const wd = weekdayProfile(days).filter((w) => w.pct !== null && w.days >= 2)
  if (wd.length >= 3) {
    const sorted = [...wd].sort((a, b) => a.pct! - b.pct!)
    const lo = sorted[0]
    const hi = sorted[sorted.length - 1]
    if (hi.pct! - lo.pct! >= 10) {
      out.push({ tone: 'bad', title: `${lo.label} is your weakest day`, sub: `${lo.pct}% done • Best ${hi.label} ${hi.pct}%`, weight: (hi.pct! - lo.pct!) / 10 })
    }
  }

  const reasons = days.filter((d) => d.mode === 'miss' && d.missReason).map((d) => d.missReason!)
  const counts = reasons.reduce<Record<string, number>>((a, r) => ((a[r] = (a[r] ?? 0) + 1), a), {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= 2) out.push({ tone: 'info', title: `Top Miss trigger • ${top[0]}`, sub: `${top[1]} Miss days this period`, weight: 1 })

  return out.sort((a, b) => b.weight - a.weight)
}

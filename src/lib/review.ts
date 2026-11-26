import type { AppData, DayLog } from '../types'
import { activeGoals, evaluateGoal } from './goals'
import { computeFacets, growthHours, lifeScore, logsIn } from './insights'
import { blockReport, blockScore, summarizeWeek, weakest } from './stats'
import { addDays, dowIndex, weekDays, weekStartOf } from './time'
import { dietAdherence, eatOutsInWeek } from './diet'

/** Sunday reviews the current week; any other day reviews the previous week. */
export const defaultReviewWeek = (today: string) => (dowIndex(today) === 6 ? weekStartOf(today) : addDays(weekStartOf(today), -7))

export function weekReview(data: AppData, ws: string, today: string) {
  const range: [string, string] = [ws, addDays(ws, 6)]
  const days = logsIn(data, range)
  const prevDays = logsIn(data, [addDays(ws, -7), addDays(ws, -1)])
  const summary = summarizeWeek(data, ws, today)
  const facets = computeFacets(data, days)
  const prevFacets = prevDays.some((d) => d.mode) ? computeFacets(data, prevDays) : null

  const byDay = weekDays(ws).map((key) => {
    const d = data.days[key]
    const s = blockScore(d)
    return { key, mode: d?.mode, done: s.done, total: s.total, pct: s.total ? Math.round((s.done / s.total) * 100) : null, energy: d?.energy }
  })
  const scored = byDay.filter((d) => d.mode && d.pct !== null)
  const best = scored.length ? scored.reduce((a, b) => (b.pct! > a.pct! ? b : a)) : null
  const toughest = scored.length > 1 ? scored.reduce((a, b) => (b.pct! < a.pct! ? b : a)) : null
  const energies = days.map((d) => d.energy).filter((e): e is number => !!e)

  const elapsed = weekDays(ws).filter((k) => k <= today).length
  const habits = data.habits.map((h) =>
    h.kind === 'daily'
      ? { habit: h, done: days.filter((d) => d.habits[h.id]).length, of: elapsed }
      : { habit: h, done: data.weeks[ws]?.care[h.id] ? 1 : 0, of: 1 },
  )

  const goals = activeGoals(data)
    .filter((g) => g.period === 'week')
    .map((g) => ({ goal: g, ev: evaluateGoal(data, g, today, ws) }))

  const reflect = (f: (d: DayLog) => string | undefined) =>
    days
      .map((d) => ({ date: d.date, text: f(d) }))
      .filter((x): x is { date: string; text: string } => !!x.text)

  return {
    ws,
    summary,
    facets,
    prevFacets,
    life: lifeScore(facets),
    prevLife: prevFacets ? lifeScore(prevFacets) : null,
    growth: growthHours(facets),
    prevGrowth: prevFacets ? growthHours(prevFacets) : null,
    byDay,
    best,
    toughest,
    avgEnergy: energies.length ? energies.reduce((a, b) => a + b) / energies.length : null,
    habits,
    diet: { ...dietAdherence(data, days), eatOuts: eatOutsInWeek(data, ws).length, allowance: data.mealPlan.eatOutPerWeek },
    goals,
    bottleneck: weakest(blockReport(days))[0] ?? null,
    wins: reflect((d) => d.reflection?.win),
    lessons: reflect((d) => d.reflection?.lesson),
    grateful: reflect((d) => d.reflection?.grateful),
    bothers: reflect((d) => {
      const b = d.reflection?.bother
      const w = d.reflection?.why
      return b ? (w ? `${b} — because ${w}` : b) : undefined
    }),
    missReasons: days.filter((d) => d.mode === 'miss').map((d) => d.missReason ?? 'No reason'),
    logged: days.filter((d) => d.mode).length,
  }
}

/** Week start of a finished-but-unreviewed week to nudge about (Sun–Tue only), else null. */
export function reviewDue(data: AppData, today: string): string | null {
  const dow = dowIndex(today)
  if (dow > 1 && dow < 6) return null
  const ws = defaultReviewWeek(today)
  if (data.weeks[ws]?.review?.completedAt) return null
  const logged = weekDays(ws).some((k) => data.days[k]?.mode)
  return logged ? ws : null
}

import type { AppData, Goal, GoalKind, GoalPeriod } from '../types'
import { blockMinutes, facetOfCategory } from './facets'
import { effectiveStatus } from './stats'
import { addDays, fromKey, toKey, weekStartOf } from './time'

export const GOAL_KIND_META: Record<GoalKind, { label: string; unit: (n: number) => string; sub: string }> = {
  hours: { label: 'Hours', unit: (n) => `${round1(n)}h`, sub: 'Auto • Done block time' },
  sessions: { label: 'Sessions', unit: (n) => `${n}x`, sub: 'Auto • Days with a done block' },
  habit: { label: 'Habit days', unit: (n) => `${n}d`, sub: 'Auto • Days a habit was kept' },
  manual: { label: 'Count', unit: (n) => `${n}`, sub: 'You count • Tap + / −' },
}

export const GOAL_PERIOD_LABEL: Record<GoalPeriod, string> = { week: 'Weekly', month: 'Monthly', custom: 'By a date' }

const round1 = (n: number) => Math.round(n * 10) / 10
const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)

export interface PeriodRange {
  key: string
  from: string
  to: string
}

/** The period instance of `goal` that contains `ref`. */
export function periodFor(goal: Goal, ref: string): PeriodRange {
  if (goal.period === 'week') {
    const from = weekStartOf(ref)
    return { key: from, from, to: addDays(from, 6) }
  }
  if (goal.period === 'month') {
    const d = fromKey(ref)
    const from = toKey(new Date(d.getFullYear(), d.getMonth(), 1))
    return { key: from, from, to: toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
  }
  const from = goal.start ?? goal.createdAt
  return { key: 'custom', from, to: goal.end && goal.end >= from ? goal.end : addDays(from, 29) }
}

/** Measured progress for a goal within [from, to] (inclusive). */
export function goalValue(data: AppData, goal: Goal, range: PeriodRange): number {
  if (goal.kind === 'manual') return goal.manual?.[range.key] ?? 0
  const days = Object.values(data.days).filter((d) => d.date >= range.from && d.date <= range.to)
  if (goal.kind === 'habit') return goal.habitId ? days.filter((d) => d.habits[goal.habitId!]).length : 0
  let minutes = 0
  let sessions = 0
  for (const d of days) {
    let hit = false
    for (const b of d.blocks) {
      if (facetOfCategory(b.category) !== goal.facet) continue
      if (effectiveStatus(d, b.id) !== 'completed') continue
      minutes += blockMinutes(b)
      hit = true
    }
    if (hit) sessions++
  }
  return goal.kind === 'hours' ? round1(minutes / 60) : sessions
}

export type GoalStatus = 'done' | 'on-track' | 'behind' | 'off-track' | 'upcoming' | 'missed'

export interface GoalEval {
  range: PeriodRange
  value: number
  target: number
  pct: number
  expected: number
  status: GoalStatus
  daysLeft: number
  /** Still needed per remaining day to hit the target */
  needPerDay: number
}

export function evaluateGoal(data: AppData, goal: Goal, today: string, ref = today): GoalEval {
  const range = periodFor(goal, ref)
  const value = goalValue(data, goal, range)
  const target = Math.max(goal.target, 0.0001)
  const total = daysBetween(range.from, range.to) + 1
  // Pace counts finished days, plus today only once it has been logged
  const todayLogged = !!data.days[today]?.mode
  const elapsed = Math.min(total, Math.max(0, daysBetween(range.from, today) + (todayLogged ? 1 : 0)))
  const expected = (goal.target * elapsed) / total
  const daysLeft = Math.max(0, daysBetween(today, range.to) + 1)
  const pct = Math.min(100, Math.round((value / target) * 100))
  let status: GoalStatus
  if (value >= goal.target) status = 'done'
  else if (today < range.from) status = 'upcoming'
  else if (today > range.to) status = 'missed'
  else {
    const r = expected ? value / expected : 1
    status = r >= 0.9 ? 'on-track' : r >= 0.6 ? 'behind' : 'off-track'
  }
  const needPerDay = daysLeft ? Math.max(0, goal.target - value) / daysLeft : 0
  return { range, value, target: goal.target, pct, expected, status, daysLeft, needPerDay }
}

/** Results of the last `n` completed periods for recurring goals (oldest first). */
export function goalHistory(data: AppData, goal: Goal, today: string, n = 4) {
  if (goal.period === 'custom') return []
  const out: { key: string; value: number; hit: boolean }[] = []
  let ref = periodFor(goal, today).from
  for (let i = 0; i < n; i++) {
    ref = addDays(ref, -1) // step into the previous period
    const range = periodFor(goal, ref)
    if (range.to < goal.createdAt) break
    const value = goalValue(data, goal, range)
    out.unshift({ key: range.key, value, hit: value >= goal.target })
    ref = range.from
  }
  return out
}

export const activeGoals = (data: AppData) => data.goals.filter((g) => !g.archived)

import type { AppData, DayLog, MealLog, MealPlan, MealSlot } from '../types'
import { weekDays, weekStartOf } from './time'

/**
 * Rough diet adherence — deliberately no calories or grams.
 *  on      ate a planned option
 *  treat   eating out / cheat meal within the weekly allowance (still on plan)
 *  over    eating out beyond the allowance (off plan)
 *  off     "Something else"
 *  skipped didn't have it
 *  open    not logged yet
 */
export type MealState = 'on' | 'treat' | 'over' | 'off' | 'skipped' | 'open'

export const optionOf = (slot: MealSlot, log?: MealLog) => (log?.optionId ? slot.options.find((o) => o.id === log.optionId) : undefined)

/** Eating-out logs in a week, in time order: the first N fit the allowance. */
export function eatOutsInWeek(data: AppData, ws: string) {
  const out: { date: string; slotId: string }[] = []
  for (const date of weekDays(ws)) {
    const meals = data.days[date]?.meals
    if (!meals) continue
    for (const slot of data.mealPlan.slots) {
      const log = meals[slot.id]
      if (log?.status === 'done' && optionOf(slot, log)?.eatingOut) out.push({ date, slotId: slot.id })
    }
  }
  return out
}

export function mealState(data: AppData, date: string, slot: MealSlot, allowed?: Set<string>): MealState {
  const log = data.days[date]?.meals?.[slot.id]
  if (!log) return 'open'
  if (log.status === 'skipped') return 'skipped'
  const opt = optionOf(slot, log)
  if (opt?.offPlan) return 'off'
  if (opt?.eatingOut) {
    const ok = allowed ?? allowedEatOuts(data, date)
    return ok.has(`${date}|${slot.id}`) ? 'treat' : 'over'
  }
  return 'on'
}

/** Keys ("date|slot") of eating-out meals that fit within the week's allowance. */
export function allowedEatOuts(data: AppData, date: string) {
  const list = eatOutsInWeek(data, weekStartOf(date))
  return new Set(list.slice(0, data.mealPlan.eatOutPerWeek).map((x) => `${x.date}|${x.slotId}`))
}

export interface DaySummary {
  total: number
  logged: number
  onPlan: number
  missed: number // skipped + off + over
  open: number
  pct: number | null
  /** null until something is logged */
  eatRight: boolean | null
  ateOutToday: boolean
  water: number
  waterTarget: number
}

export function daySummary(data: AppData, date: string): DaySummary {
  const plan: MealPlan = data.mealPlan
  const allowed = allowedEatOuts(data, date)
  const states = plan.slots.map((s) => ({ slot: s, state: mealState(data, date, s, allowed) }))
  const good = (st: MealState) => st === 'on' || st === 'treat'
  const logged = states.filter((x) => x.state !== 'open').length
  const onPlan = states.filter((x) => good(x.state)).length
  const missed = states.filter((x) => x.state === 'skipped' || x.state === 'off' || x.state === 'over').length
  const mainOk = states.filter((x) => x.slot.main).every((x) => good(x.state))
  const smallMisses = states.filter((x) => !x.slot.main && !good(x.state) && x.state !== 'open').length
  const day = data.days[date]
  return {
    total: plan.slots.length,
    logged,
    onPlan,
    missed,
    open: plan.slots.length - logged,
    pct: logged ? Math.round((onPlan / plan.slots.length) * 100) : null,
    eatRight: logged ? mainOk && smallMisses <= 1 : null,
    ateOutToday: states.some((x) => x.state === 'treat' || x.state === 'over'),
    water: day?.water ?? 0,
    waterTarget: plan.waterGlasses,
  }
}

/** Plan adherence over many days: on-plan meals ÷ planned meals, counting only days with logs. */
export function dietAdherence(data: AppData, days: DayLog[]) {
  let on = 0
  let total = 0
  let daysTracked = 0
  let eatRightDays = 0
  let waterDays = 0
  for (const d of days) {
    if (!d.meals || !Object.keys(d.meals).length) continue
    const s = daySummary(data, d.date)
    daysTracked++
    on += s.onPlan
    total += s.total
    if (s.eatRight) eatRightDays++
    if (s.water >= s.waterTarget) waterDays++
  }
  return { pct: total ? Math.round((on / total) * 100) : null, daysTracked, eatRightDays, waterDays }
}

/** Auto "Eat Right": recompute for every logged day in the week of `date` (allowance can shift). */
export function syncEatRight(data: AppData, date: string) {
  if (!data.habits.some((h) => h.id === 'eatright')) return
  for (const k of weekDays(weekStartOf(date))) {
    const day = data.days[k]
    if (!day?.meals || !Object.keys(day.meals).length) continue
    day.habits.eatright = daySummary(data, k).eatRight === true
  }
}

/** The slot to focus now: the latest one whose time has passed and isn't logged, else the next upcoming. */
export function currentSlotId(plan: MealPlan, meals: Record<string, MealLog> | undefined, nowMinutes: number) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const sorted = [...plan.slots].sort((a, b) => toMin(a.time) - toMin(b.time))
  const due = sorted.filter((s) => toMin(s.time) <= nowMinutes && !meals?.[s.id])
  if (due.length) return due[due.length - 1].id
  return sorted.find((s) => toMin(s.time) > nowMinutes)?.id
}

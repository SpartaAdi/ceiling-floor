import type { AppData, DayLog, MealLog, MealPlan, MealSlot } from '../types'
import { toKey, weekDays, weekStartOf } from './time'
import { foodN, selectedOptionIds } from './nutrition'
import { effectiveStatus } from './stats'

/**
 * Rough diet adherence — deliberately no calories or grams.
 *  on      ate a planned option
 *  treat   eating out / cheat meal within the weekly allowance (still on plan)
 *  over    eating out beyond the allowance (off plan)
 *  off     "Something else"
 *  skipped didn't have it
 *  open    not logged yet (today/future only — on past days an unlogged meal counts as skipped)
 */
export type MealState = 'on' | 'treat' | 'over' | 'off' | 'skipped' | 'open'

/** Selected plan options (multi-select; older logs had a single optionId). */
export const optionsOf = (slot: MealSlot, log?: MealLog) =>
  selectedOptionIds(log)
    .map((id) => slot.options.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o)

/** First selected option (kept for older call sites). */
export const optionOf = (slot: MealSlot, log?: MealLog) => optionsOf(slot, log)[0]

/** Foods that belong to this slot's plan (so typing "3 eggs" in the egg slot stays on plan). */
const planFoods = (slot: MealSlot) => new Set(slot.options.filter((o) => !o.offPlan && !o.eatingOut).flatMap((o) => (o.items ?? []).map((i) => i.food)))

/** Eating-out logs in a week, in time order: the first N fit the allowance. */
export function eatOutsInWeek(data: AppData, ws: string) {
  const out: { date: string; slotId: string }[] = []
  for (const date of weekDays(ws)) {
    const meals = data.days[date]?.meals
    if (!meals) continue
    for (const slot of data.mealPlan.slots) {
      const log = meals[slot.id]
      if (log?.status === 'done' && optionsOf(slot, log).some((o) => o.eatingOut)) out.push({ date, slotId: slot.id })
    }
  }
  return out
}

export function mealState(data: AppData, date: string, slot: MealSlot, allowed?: Set<string>): MealState {
  const log = data.days[date]?.meals?.[slot.id]
  if (!log) return date < toKey(new Date()) && hasDietLog(data, date) ? 'skipped' : 'open'
  if (log.status === 'skipped') return 'skipped'
  const opts = optionsOf(slot, log)
  if (opts.some((o) => o.eatingOut)) {
    const ok = allowed ?? allowedEatOuts(data, date)
    return ok.has(`${date}|${slot.id}`) ? 'treat' : 'over'
  }
  if (opts.some((o) => o.offPlan)) return 'off'
  const extras = log.extras ?? []
  if (!opts.length) {
    // Only typed foods: on plan when they're all foods this meal plans for
    const pf = planFoods(slot)
    const known = extras.filter((e) => e.food) // unrecognised notes don't decide
    if (!known.length) return extras.length ? 'off' : 'on'
    return known.every((e) => pf.has(e.food!)) ? 'on' : 'off'
  }
  return 'on'
}

/** Diet tracking started on or before this day (so unlogged meals then count as skipped). */
export function hasDietLog(data: AppData, date: string) {
  const start = dietStart(data)
  return !!start && date >= start
}
let startCache: { days: AppData['days']; start?: string } | null = null
/** First day anything diet-related was logged. */
export function dietStart(data: AppData) {
  if (startCache?.days === data.days) return startCache.start
  let start: string | undefined
  for (const [k, d] of Object.entries(data.days)) {
    if ((d.meals && Object.keys(d.meals).length) || d.foodLog?.length) if (!start || k < start) start = k
  }
  startCache = { days: data.days, start }
  return start
}

/** All foods any planned option uses — logging one of these is never "off plan". */
export function allPlanFoods(data: AppData) {
  return new Set(data.mealPlan.slots.flatMap((s) => s.options.filter((o) => !o.offPlan && !o.eatingOut).flatMap((o) => (o.items ?? []).map((i) => i.food))))
}

/** Food-log entries that break the plan: not a planned food and more than a nibble (> 100 kcal). */
export function offPlanEntries(data: AppData, date: string) {
  const plan = allPlanFoods(data)
  return (data.days[date]?.foodLog ?? []).filter((e) => !(e.food && plan.has(e.food)) && foodN(e.food, e.qty).kcal > 100)
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
  /** Off-plan food-log entries that day */
  extrasOff: number
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
  const extrasOff = offPlanEntries(data, date).length
  const anything = logged > 0 || (day?.foodLog?.length ?? 0) > 0
  return {
    total: plan.slots.length,
    logged,
    onPlan,
    missed,
    open: plan.slots.length - logged,
    pct: logged ? Math.round((onPlan / plan.slots.length) * 100) : null,
    eatRight: anything ? mainOk && smallMisses <= 1 && extrasOff === 0 : null,
    extrasOff,
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
  const today = toKey(new Date())
  for (const d of days) {
    // Every day since you started tracking counts (unlogged = skipped); today only once something is logged
    const tracked = d.date < today ? hasDietLog(data, d.date) : !!((d.meals && Object.keys(d.meals).length) || d.foodLog?.length)
    if (!tracked) continue
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
    if (!day || !((day.meals && Object.keys(day.meals).length) || day.foodLog?.length)) continue
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

/** Auto "Exercise": done when any fitness block was ticked done that day. */
export function syncExercise(data: AppData, date: string) {
  if (!data.habits.some((h) => h.id === 'exercise')) return
  const day = data.days[date]
  if (!day?.blocks.length) return
  day.habits.exercise = day.blocks.some((b) => b.category === 'fitness' && effectiveStatus(day, b.id) === 'completed')
}

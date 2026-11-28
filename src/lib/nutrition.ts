import type { AppData, MealLog, MealOption, MealSlot } from '../types'
import { foodById } from '../data/foods'

/** Estimated nutrition — derived from portions, never typed by the user. */
export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
}
export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
export const addN = (a: Nutrients, b: Nutrients): Nutrients => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat })

export function foodN(foodId: string | undefined, qty: number): Nutrients {
  const f = foodById(foodId)
  if (!f) return ZERO
  return { kcal: f.kcal * qty, protein: f.protein * qty, carbs: f.carbs * qty, fat: f.fat * qty }
}

/** Selected plan options (supports the older single `optionId`). */
export const selectedOptionIds = (log?: MealLog) => log?.optionIds ?? (log?.optionId ? [log.optionId] : [])

/** Food items an option contributes, applying the user's quantity. */
export function optionItems(opt: MealOption, servings?: number): { food: string; qty: number }[] {
  const items = opt.items ?? []
  if (servings === undefined) return items
  if (opt.adjust) return items.map((i) => (i.food === opt.adjust ? { ...i, qty: servings } : i))
  return items.map((i) => ({ ...i, qty: i.qty * servings }))
}

/** Default quantity shown for an option (count of the adjustable food, or 1 serving). */
export const defaultServings = (opt: MealOption) => (opt.adjust ? (opt.items?.find((i) => i.food === opt.adjust)?.qty ?? 1) : 1)

export function mealItems(slot: MealSlot, log?: MealLog) {
  if (!log || log.status !== 'done') return []
  const out: { food?: string; name?: string; qty: number }[] = []
  for (const id of selectedOptionIds(log)) {
    const opt = slot.options.find((o) => o.id === id)
    if (opt) out.push(...optionItems(opt, log.servings?.[id]))
  }
  for (const a of slot.addOns ?? []) if (log.addOns?.includes(a.id)) out.push(...(a.items ?? []))
  for (const e of log.extras ?? []) out.push(e)
  return out
}

export const mealN = (slot: MealSlot, log?: MealLog) => mealItems(slot, log).reduce((acc, i) => addN(acc, foodN(i.food, i.qty)), ZERO)

/** Total of a list of logged foods (unrecognised notes count as zero). */
export const foodsN = (list: { food?: string; qty: number }[] = []) => list.reduce((acc, i) => addN(acc, foodN(i.food, i.qty)), ZERO)

/** Everything eaten that day: planned meals + the timed food log. */
export function dayN(data: AppData, date: string) {
  const day = data.days[date]
  const meals = day?.meals ?? {}
  return addN(data.mealPlan.slots.reduce((acc, s) => addN(acc, mealN(s, meals[s.id])), ZERO), foodsN(day?.foodLog))
}

export type Range = [number, number]
export const DEFAULT_TARGETS: Record<keyof Nutrients, Range> = { kcal: [1450, 1650], protein: [110, 125], carbs: [110, 160], fat: [45, 60] }

export function rangeStatus(v: number, [lo, hi]: Range): 'low' | 'ok' | 'high' {
  return v < lo ? 'low' : v > hi ? 'high' : 'ok'
}

export const round = (n: number) => Math.round(n)

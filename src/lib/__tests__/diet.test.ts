import { describe, expect, it } from 'vitest'
import { allowedEatOuts, currentSlotId, daySummary, dietAdherence, eatOutsInWeek, mealState, syncEatRight } from '../diet'
import { normalize } from '../../services/storageService'
import { mergeData, stampChanges } from '../../sync/merge'
import { withDemoData } from '../demo'
import { FRI, MON, SAT, TUE, WED, fresh } from './helpers'
import type { AppData, MealLog } from '../../types'

const log = (d: AppData, date: string, slot: string, l: MealLog) => {
  d.days[date] ??= { date, blocks: [], statuses: {}, habits: {}, updatedAt: 0 }
  ;(d.days[date].meals ??= {})[slot] = l
}
const planDay = (d: AppData, date: string, overrides: Record<string, MealLog> = {}) => {
  for (const s of d.mealPlan.slots) log(d, date, s.id, overrides[s.id] ?? { status: 'done', optionId: s.options[0].id })
}
const slot = (d: AppData, id: string) => d.mealPlan.slots.find((s) => s.id === id)!

describe('default plan from the chart', () => {
  it('has the 7 meals in order with the right choices, and no numbers', () => {
    const p = fresh().mealPlan
    expect(p.slots.map((s) => s.time)).toEqual(['05:00', '06:15', '08:30', '10:00', '12:00', '14:30', '18:00'])
    expect(slot(fresh(), 'lunch').options.map((o) => o.label)).toEqual(['Classic thali', 'High-protein veg', 'Chicken bowl', 'Chilla plate', 'Ate out', 'Something else'])
    expect(slot(fresh(), 'salad').addOns?.[0].label).toBe('4 almonds + 1 walnut')
    expect(p.waterGlasses).toBe(12)
    expect(p.eatOutPerWeek).toBe(1)
    expect(JSON.stringify(p)).not.toMatch(/kcal|calorie|protein":/i)
  })
})

describe('meal states', () => {
  it('open, on plan, skipped, off plan', () => {
    const d = fresh()
    expect(mealState(d, MON, slot(d, 'lunch'))).toBe('open')
    log(d, MON, 'lunch', { status: 'done', optionId: 'thali' })
    expect(mealState(d, MON, slot(d, 'lunch'))).toBe('on')
    log(d, MON, 'lunch', { status: 'skipped' })
    expect(mealState(d, MON, slot(d, 'lunch'))).toBe('skipped')
    log(d, MON, 'lunch', { status: 'done', optionId: 'other' })
    expect(mealState(d, MON, slot(d, 'lunch'))).toBe('off')
  })
  it('first eating-out of the week is a treat, the next goes over', () => {
    const d = fresh()
    log(d, TUE, 'lunch', { status: 'done', optionId: 'out' })
    log(d, SAT, 'dinner', { status: 'done', optionId: 'cheat' })
    expect(eatOutsInWeek(d, MON)).toHaveLength(2)
    expect(mealState(d, TUE, slot(d, 'lunch'))).toBe('treat')
    expect(mealState(d, SAT, slot(d, 'dinner'))).toBe('over')
    d.mealPlan.eatOutPerWeek = 2
    expect(allowedEatOuts(d, SAT).size).toBe(2)
    expect(mealState(d, SAT, slot(d, 'dinner'))).toBe('treat')
  })
})

describe('day summary + Eat Right', () => {
  it('nothing logged → no verdict', () => {
    expect(daySummary(fresh(), MON)).toMatchObject({ logged: 0, pct: null, eatRight: null, water: 0, waterTarget: 12 })
  })
  it('all on plan → Eat Right', () => {
    const d = fresh()
    planDay(d, MON)
    expect(daySummary(d, MON)).toMatchObject({ total: 7, onPlan: 7, missed: 0, pct: 100, eatRight: true })
  })
  it('one small miss is fine; two are not; a main meal miss is not', () => {
    const d = fresh()
    planDay(d, MON, { jeera: { status: 'skipped' } })
    expect(daySummary(d, MON).eatRight).toBe(true)
    planDay(d, TUE, { jeera: { status: 'skipped' }, pregym: { status: 'skipped' } })
    expect(daySummary(d, TUE).eatRight).toBe(false)
    planDay(d, WED, { dinner: { status: 'done', optionId: 'other' } })
    expect(daySummary(d, WED).eatRight).toBe(false)
  })
  it('eating out within the allowance still counts as on plan', () => {
    const d = fresh()
    planDay(d, FRI, { lunch: { status: 'done', optionId: 'out' }, dinner: { status: 'done', optionId: 'light' } })
    expect(daySummary(d, FRI)).toMatchObject({ onPlan: 7, eatRight: true, ateOutToday: true })
  })
  it('auto Eat Right updates the habit, and re-checks the whole week', () => {
    const d = fresh()
    planDay(d, WED, { lunch: { status: 'done', optionId: 'out' } })
    syncEatRight(d, WED)
    expect(d.days[WED].habits.eatright).toBe(true)
    planDay(d, MON, { dinner: { status: 'done', optionId: 'cheat' } }) // earlier eat-out uses the allowance
    syncEatRight(d, MON)
    expect(d.days[MON].habits.eatright).toBe(true)
    expect(d.days[WED].habits.eatright).toBe(false) // Wednesday's is now over the allowance
  })
  it('adherence across days ignores days with no meals logged', () => {
    const d = fresh()
    planDay(d, MON)
    planDay(d, TUE, { lunch: { status: 'skipped' } })
    d.days[WED] = { date: WED, blocks: [], statuses: {}, habits: {}, updatedAt: 0 }
    d.days[MON].water = 12
    expect(dietAdherence(d, Object.values(d.days))).toEqual({ pct: 93, daysTracked: 2, eatRightDays: 1, waterDays: 1 })
  })
})

describe('focus slot', () => {
  it('latest unlogged past meal, else the next one', () => {
    const p = fresh().mealPlan
    expect(currentSlotId(p, {}, 9 * 60)).toBe('shake')
    expect(currentSlotId(p, { shake: { status: 'done' } }, 9 * 60)).toBe('pregym')
    expect(currentSlotId(p, {}, 4 * 60)).toBe('jeera')
  })
})

describe('storage + sync', () => {
  it('old data gets the default plan; saved plans survive', () => {
    expect(normalize({ version: 2, days: {} }).mealPlan.slots).toHaveLength(7)
    const d = fresh()
    d.mealPlan.waterGlasses = 10
    expect(normalize(JSON.parse(JSON.stringify(d))).mealPlan.waterGlasses).toBe(10)
  })
  it('meal plan edits sync as a section; meal logs sync per day', () => {
    const a = fresh()
    const b = structuredClone(a)
    const b2 = structuredClone(b)
    b2.mealPlan.waterGlasses = 14
    planDay(b2, MON)
    const bs = stampChanges(b, b2, 500)
    const m = mergeData(a, bs)
    expect(m.mealPlan.waterGlasses).toBe(14)
    expect(m.days[MON].meals?.lunch?.status).toBe('done')
  })
  it('demo Eat Right agrees with the demo meals', () => {
    const d = withDemoData(fresh(), '2026-11-21')
    for (const day of Object.values(d.days)) expect(!!day.habits.eatright).toBe(daySummary(d, day.date).eatRight === true)
  })
})

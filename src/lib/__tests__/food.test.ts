import { describe, expect, it } from 'vitest'
import { parseFoods, matchFood } from '../foodParse'
import { FOODS, FOOD_BY_ID, qtyLabel } from '../../data/foods'
import { dayN, foodN, mealN, rangeStatus } from '../nutrition'
import { mealState, syncExercise } from '../diet'
import { applyDayMode } from '../dayLogic'
import { normalize } from '../../services/storageService'
import { defaultMealPlan, upgradeMealPlan } from '../../data/defaults'
import { MON, fresh } from './helpers'
import type { AppData, MealLog } from '../../types'

const slot = (d: AppData, id: string) => d.mealPlan.slots.find((s) => s.id === id)!
const log = (d: AppData, date: string, s: string, l: MealLog) => {
  d.days[date] ??= { date, blocks: [], statuses: {}, habits: {}, updatedAt: 0 }
  ;(d.days[date].meals ??= {})[s] = l
}
const ids = (text: string) => parseFoods(text).map((p) => [p.food?.id ?? `?${p.raw}`, p.qty, p.qtyGiven])

describe('food list', () => {
  it('ids are unique and every food has sane numbers', () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length)
    for (const f of FOODS) {
      expect(f.kcal).toBeGreaterThanOrEqual(0)
      // energy roughly matches macros (4/4/9 rule) for anything non-trivial
      if (f.kcal > 30) expect(Math.abs(f.protein * 4 + f.carbs * 4 + f.fat * 9 - f.kcal) / f.kcal).toBeLessThan(0.35)
    }
  })
  it('labels quantities in easy units', () => {
    expect(qtyLabel(FOOD_BY_ID.egg, 3)).toBe('3 eggs')
    expect(qtyLabel(FOOD_BY_ID.egg, 1)).toBe('1 egg')
    expect(qtyLabel(FOOD_BY_ID.poha, 0.5)).toBe('½ katori')
    expect(qtyLabel(FOOD_BY_ID.milk, 1.5)).toBe('1½ glasses')
    expect(qtyLabel(FOOD_BY_ID.chickenbreast, 1.5)).toBe('150 g')
  })
})

describe('parseFoods', () => {
  it('reads counts, fractions and words', () => {
    expect(ids('3 boiled eggs, ½ katori poha, some upma')).toEqual([
      ['egg', 3, true],
      ['poha', 0.5, true],
      ['upma', 1, false],
    ])
    expect(ids('half katori dal and 2 roti')).toEqual([
      ['dal', 0.5, true],
      ['roti', 2, true],
    ])
    expect(ids('ek glass doodh + do anda')).toEqual([
      ['milk', 1, true],
      ['egg', 2, true],
    ])
    expect(ids('1/2 apple')).toEqual([['apple', 0.5, true]])
    expect(ids('1 1/2 katori rice')).toEqual([['rice', 1.5, true]])
  })
  it('prefers the more specific food', () => {
    expect(matchFood('egg whites').food?.id).toBe('eggwhite')
    expect(matchFood('masala dosa').food?.id).toBe('masaladosa')
    expect(matchFood('chicken curry').food?.id).toBe('chickencurry')
    expect(matchFood('greek yogurt').food?.id).toBe('hungcurd')
  })
  it('handles Hinglish names and small typos', () => {
    expect(matchFood('dahi').food?.id).toBe('curd')
    expect(matchFood('chawal').food?.id).toBe('rice')
    expect(matchFood('panner').food?.id).toBe('paneer')
    expect(matchFood('omlet').food?.id).toBe('omelette')
  })
  it('converts grams/ml using the food unit', () => {
    expect(ids('150g chicken breast')).toEqual([['chickenbreast', 1.5, true]])
    expect(ids('400 ml milk')).toEqual([['milk', 2, true]])
  })
  it('flags unknown foods instead of guessing', () => {
    const [p] = parseFoods('quinoa salad bowl thing')
    expect(p.food?.id === undefined || p.food.id.startsWith('salad')).toBe(true)
    const [q] = parseFoods('zzqx')
    expect(q.food).toBeUndefined()
  })
})

describe('estimates', () => {
  it('eggs follow the count you pick; light swap adds on top (multi-select)', () => {
    const d = fresh()
    log(d, MON, 'eggs', { status: 'done', optionIds: ['boiled'] })
    expect(mealN(slot(d, 'eggs'), d.days[MON].meals!.eggs).kcal).toBeCloseTo(225)
    log(d, MON, 'eggs', { status: 'done', optionIds: ['boiled'], servings: { boiled: 4 } })
    expect(mealN(slot(d, 'eggs'), d.days[MON].meals!.eggs).protein).toBeCloseTo(25.2)
    log(d, MON, 'eggs', { status: 'done', optionIds: ['boiled', 'swap'], servings: { boiled: 2 } })
    const n = mealN(slot(d, 'eggs'), d.days[MON].meals!.eggs)
    expect(n.kcal).toBeCloseTo(150 + 150 + 34 + 90)
  })
  it('servings scale other options; add-ons and typed foods count', () => {
    const d = fresh()
    log(d, MON, 'salad', { status: 'done', optionIds: ['classic', 'sprouts'], addOns: ['nuts'], extras: [{ food: 'chana', name: 'Roasted chana', qty: 1 }] })
    const n = mealN(slot(d, 'salad'), d.days[MON].meals!.salad)
    expect(n.kcal).toBeCloseTo(55 + 110 + 28 + 26 + 110)
    log(d, MON, 'lunch', { status: 'done', optionIds: ['thali'], servings: { thali: 1.5 } })
    expect(mealN(slot(d, 'lunch'), d.days[MON].meals!.lunch).kcal).toBeCloseTo((100 + 150 + 120 + 90 + 12) * 1.5)
    expect(dayN(d, MON).kcal).toBeGreaterThan(900)
  })
  it('skipped meals and notes add nothing', () => {
    const d = fresh()
    log(d, MON, 'shake', { status: 'skipped' })
    log(d, MON, 'lunch', { status: 'done', extras: [{ name: 'mystery dish', qty: 1 }] })
    expect(dayN(d, MON).kcal).toBe(0)
  })
  it('range status against chart targets', () => {
    expect(rangeStatus(90, [110, 125])).toBe('low')
    expect(rangeStatus(118, [110, 125])).toBe('ok')
    expect(rangeStatus(130, [110, 125])).toBe('high')
    expect(foodN('whey', 1).protein).toBe(24)
  })
})

describe('plan adherence with multi-select and typed foods', () => {
  it('typed foods from this meal plan stay on plan; anything else is off plan', () => {
    const d = fresh()
    log(d, MON, 'eggs', { status: 'done', extras: [{ food: 'egg', name: 'Boiled egg', qty: 3 }] })
    expect(mealState(d, MON, slot(d, 'eggs'))).toBe('on')
    log(d, MON, 'eggs', { status: 'done', extras: [{ food: 'samosa', name: 'Samosa', qty: 2 }] })
    expect(mealState(d, MON, slot(d, 'eggs'))).toBe('off')
    log(d, MON, 'salad', { status: 'done', optionIds: ['classic', 'spinach'] })
    expect(mealState(d, MON, slot(d, 'salad'))).toBe('on')
    log(d, MON, 'lunch', { status: 'done', optionIds: ['thali', 'other'] })
    expect(mealState(d, MON, slot(d, 'lunch'))).toBe('off')
    // older single-choice logs still work
    log(d, MON, 'pregym', { status: 'done', optionId: 'coffee' })
    expect(mealState(d, MON, slot(d, 'pregym'))).toBe('on')
  })
})

describe('Exercise auto-habit', () => {
  it('ticks when any fitness block is done, unticks when they are all missed', () => {
    const d = fresh()
    applyDayMode(d, MON, 'ceiling')
    syncExercise(d, MON)
    expect(d.days[MON].habits.exercise).toBe(true)
    for (const b of d.days[MON].blocks) if (b.category === 'fitness') d.days[MON].statuses[b.id] = 'missed'
    syncExercise(d, MON)
    expect(d.days[MON].habits.exercise).toBe(false)
  })
  it('is added once for existing users, and stays deleted if removed', () => {
    const old = { version: 2, habits: [{ id: 'meds', label: 'Meds', kind: 'daily' }, { id: 'eatright', label: 'Eat Right', kind: 'daily' }], settings: {} }
    const up = normalize(old)
    expect(up.habits.map((h) => h.id)).toEqual(['meds', 'eatright', 'exercise'])
    const removed = { ...up, habits: up.habits.filter((h) => h.id !== 'exercise') }
    expect(normalize(JSON.parse(JSON.stringify(removed))).habits.some((h) => h.id === 'exercise')).toBe(false)
  })
})

describe('upgrading a saved plan', () => {
  it('adds food items and targets without touching user edits', () => {
    const def = defaultMealPlan()
    const saved = JSON.parse(JSON.stringify(def))
    delete saved.targets
    for (const s of saved.slots) for (const o of s.options) delete o.items
    saved.slots[5].options[0].label = 'Home thali'
    saved.slots[6].options = saved.slots[6].options.filter((o: { id: string }) => o.id !== 'hungcurd')
    const up = upgradeMealPlan(saved)
    expect(up.targets).toEqual(def.targets)
    expect(up.slots[5].options[0]).toMatchObject({ label: 'Home thali', items: def.slots[5].options[0].items })
    expect(up.slots[6].options.some((o) => o.id === 'hungcurd')).toBe(true)
  })
})

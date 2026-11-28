import { afterEach, describe, expect, it } from 'vitest'
import { parseFoods, matchFood, searchBrands, searchFoods, splitBrand } from '../foodParse'
import { FOODS, FOOD_BY_ID, qtyChoices, qtyLabel, setCustomFoods } from '../../data/foods'
import { dayN, foodN, mealN, rangeStatus } from '../nutrition'
import { daySummary, mealState, offPlanEntries, syncEatRight, syncExercise } from '../diet'
import { mergeData, stampChanges } from '../../sync/merge'
import { foodFromRecipe, foodLike, recipePerServing, SERVE_UNITS } from '../myFoods'
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
      if (f.kcal > 30 && !['beer', 'wine', 'spirits'].includes(f.id)) expect(Math.abs(f.protein * 4 + f.carbs * 4 + f.fat * 9 - f.kcal) / f.kcal).toBeLessThan(0.35)
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
    expect(d.days[MON].habits.exercise).toBe(false) // nothing ticked yet = not done
    const gym = d.days[MON].blocks.find((b) => b.category === 'fitness')!
    d.days[MON].statuses[gym.id] = 'completed'
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

describe('type-ahead search', () => {
  const names = (q: string) => searchFoods(q).map((r) => r.food.id)
  it('lists every variant of what you type', () => {
    const coffee = names('coffee')
    for (const id of ['milkcoffee', 'coffee', 'filtercoffee', 'coldcoffee']) expect(coffee).toContain(id)
    expect(names('cof')[0]).toBe('milkcoffee')
    expect(names('tea')).toEqual(expect.arrayContaining(['chai', 'greentea', 'blacktea']))
    expect(names('tea')).not.toContain('rice') // "steamed" must not match "tea"
  })
  it('keeps an amount typed before the name', () => {
    const [top] = searchFoods('2 cups filter coffee')
    expect(top.food.id).toBe('filtercoffee')
    expect(top.qty).toBe(2)
  })
  it('tolerates typos, but real word matches win', () => {
    expect(names('panner')[0]).toBe('paneer')
    expect(names('samo')[0]).toBe('samosa')
    expect(names('x')).toEqual([])
    expect(names('grandma laddoo')[0]).toBe('sweet') // a known word inside
    expect(names('zinger')).toEqual(['kfc-zinger', 'kfc-vegzinger']) // not "ginger tea" / "finger chips"
  })
  it('"vada pav" is a dish, not a quarter vada', () => {
    expect(ids('vada pav')).toEqual([['vadapav', 1, false]])
  })
})

describe('restaurants and packaged foods', () => {
  const names = (q: string) => searchFoods(q).map((r) => r.food.id)
  it('brand name first, in any order, misspelt — finds the dish', () => {
    expect(names('mcd fries')).toEqual(['mcd-friesm', 'mcd-friess', 'mcd-friesl'])
    expect(names('fries from mcd')).toEqual(['mcd-friesm', 'mcd-friess', 'mcd-friesl'])
    expect(names('mc donalds aloo tikki')).toEqual(['mcd-mcaloo'])
    expect(names('dominoes farmhouse')).toEqual(['dominos-farmhouse'])
    expect(names('sagar ratan dosa')[0]).toBe('sagar-masaladosa')
    expect(names('subwy paneer')).toEqual(['subway-paneertikka'])
    expect(names('behroz chicken biryani')).toEqual(['behrouz-chicken'])
    expect(names('starbucks latte')).toEqual(['starbucks-latte'])
  })
  it('a restaurant on its own lists its whole menu', () => {
    expect(names('dominos').length).toBe(17)
    expect(names('macdonalds').every((id) => id.startsWith('mcd-'))).toBe(true)
    expect(names('mcd').length).toBeGreaterThan(15)
  })
  it('packaged snacks and chocolates by product name', () => {
    expect(names('dairy milk silk')).toEqual(['cadbury-silk'])
    expect(names('dairymilk')).toContain('cadbury-dm13')
    expect(names('5 star')).toEqual(['cadbury-fivestar']) // not 5 × Starbucks
    expect(names('kitkat')).toEqual(expect.arrayContaining(['nestle-kitkat2', 'nestle-kitkat4']))
    expect(names('banana chips')).toContain('haldiramspack-bananachips')
    expect(names('popcorn packet')).toEqual(expect.arrayContaining(['actii-rte', 'actii-butter']))
    expect(names('pastry')).toContain('bakery-blackforest')
    expect(names('lays')[0]).toMatch(/^lays-/)
  })
  it('everyday items still come first on a plain search', () => {
    expect(names('coffee')[0]).toBe('milkcoffee')
    expect(names('pizza')[0]).toBe('pizza')
    expect(names('dosa')[0]).toBe('dosa')
  })
  it('the sentence parser understands brands too', () => {
    expect(ids('mcd fries, 2 dominos farmhouse, dairy milk silk')).toEqual([
      ['mcd-friesm', 1, false],
      ['dominos-farmhouse', 2, true],
      ['cadbury-silk', 1, false],
    ])
  })
  it('half a pack / bar is offered', () => {
    expect(qtyChoices(FOOD_BY_ID['cadbury-silk'])[0]).toBe(0.5)
    expect(qtyChoices(FOOD_BY_ID.egg)[0]).toBe(1)
  })
  it('restaurant name detection for your own foods', () => {
    expect(splitBrand('sagar ratan rava dosa')).toMatchObject({ brand: { id: 'sagar' }, rest: 'rava dosa' })
    expect(splitBrand('grandma laddoo').brand).toBeUndefined()
    expect(searchBrands('dominoes')[0].id).toBe('dominos')
    expect(searchBrands('macd')[0].id).toBe('mcd')
  })
})

describe('timed food log + personal foods', () => {
  afterEach(() => setCustomFoods([]))
  it('adds to the day total and flags off-plan extras (Eat Right fails)', () => {
    const d = fresh()
    for (const s of d.mealPlan.slots) log(d, MON, s.id, { status: 'done', optionIds: [s.options[0].id] })
    const before = dayN(d, MON).kcal
    syncEatRight(d, MON)
    expect(d.days[MON].habits.eatright).toBe(true)
    d.days[MON].foodLog = [
      { id: 'a', time: '11:00', food: 'apple', name: 'Apple', qty: 1 }, // planned/small → fine
      { id: 'b', time: '17:30', food: 'samosa', name: 'Samosa', qty: 2 },
    ]
    expect(dayN(d, MON).kcal).toBeCloseTo(before + 95 + 520)
    expect(offPlanEntries(d, MON).map((e) => e.id)).toEqual(['b'])
    syncEatRight(d, MON)
    expect(d.days[MON].habits.eatright).toBe(false)
  })
  it('a food log alone starts diet tracking for the day', () => {
    const d = fresh()
    d.days[MON] = { date: MON, blocks: [], statuses: {}, habits: {}, updatedAt: 0, foodLog: [{ id: 'x', time: '20:00', food: 'pizza', name: 'Pizza', qty: 2 }] }
    expect(daySummary(d, MON).eatRight).toBe(false) // all meals unlogged on a past day → skipped
  })
  it('"like" a listed food: same numbers per serving, your name — searchable, synced', () => {
    const mine = foodLike("grandma's laddoo", FOOD_BY_ID.sweet)
    expect(mine).toMatchObject({ name: "Grandma's laddoo", unit: 'piece', kcal: 150, protein: 2, carbs: 25, fat: 5, custom: true, like: 'sweet' })
    setCustomFoods([mine])
    expect(searchFoods('laddoo')[0].food.id).toBe(mine.id) // your own foods first
    expect(foodN(mine.id, 2).kcal).toBe(300)
    expect(parseFoods("2 grandma's laddoo")[0].food?.id).toBe(mine.id)
    const a = fresh()
    const b = stampChanges(a, { ...structuredClone(a), myFoods: [mine] }, 5)
    expect(b.meta?.sections.myFoods).toBe(5)
    expect(mergeData(fresh(), b).myFoods).toEqual([mine])
    expect(normalize(JSON.parse(JSON.stringify(b))).myFoods).toEqual([mine])
  })
  it('from ingredients: total of the batch ÷ servings', () => {
    // Besan laddoo batch: 8 tbsp besan + 4 tsp ghee + 6 tsp sugar, makes 4
    const items = [
      { food: 'besan', qty: 8 },
      { food: 'ghee', qty: 4 },
      { food: 'sugar', qty: 6 },
      { name: 'love', qty: 1 }, // notes don't count
    ]
    const total = 8 * 31 + 4 * 45 + 6 * 16 // 524
    expect(recipePerServing(items, 4).kcal).toBe(Math.round(total / 4))
    expect(recipePerServing(items, 4).protein).toBeCloseTo((8 * 1.8) / 4, 1)
    const f = foodFromRecipe('besan laddoo', items, 4, SERVE_UNITS[0])
    expect(f).toMatchObject({ name: 'Besan laddoo', unit: 'piece', unitLabel: 'piece', defaultQty: 1, kcal: 131, servings: 4 })
    expect(f.recipe).toHaveLength(3)
    setCustomFoods([f])
    expect(qtyLabel(f, 2)).toBe('2 pieces')
    expect(foodN(f.id, 2).kcal).toBe(262)
    expect(recipePerServing(items, 0).kcal).toBe(total) // never divides by zero
  })
})

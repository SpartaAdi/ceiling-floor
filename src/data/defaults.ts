import type { AppData, Block, Category, Habit, MealPlan, Settings, TemplateKey } from '../types'

type Row = [start: string, end: string, title: string, details: string, category: Category]

const build = (prefix: string, rows: Row[]): Block[] =>
  rows.map(([start, end, title, details, category], i) => ({
    id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
    start,
    end,
    title,
    details,
    category,
  }))

const WEEKDAY_CEILING: Row[] = [
  ['05:00', '05:15', 'Morning Reset', 'Jal neti • Warm water', 'health'],
  ['05:15', '06:15', 'Yoga & Mind', 'Stretch • Yoga • Meditate', 'mind'],
  ['06:15', '06:30', 'Gym Prep', 'Prep • Leave for gym', 'fitness'],
  ['06:30', '08:30', 'Gym', 'Workout • Back by 8:30', 'fitness'],
  ['08:30', '09:30', 'Shake & Bath', 'Protein drink • Bath', 'health'],
  ['09:30', '10:30', 'Morning Sitting', '1 hr priority task', 'deep'],
  ['10:30', '11:00', 'Breakfast & Leave', 'Quick meal • Commute', 'meal'],
  ['11:00', '17:00', 'Office', 'Work block • Back at 5:00', 'work'],
  ['17:00', '18:00', 'Cardio & Dinner', '15m cardio • Early dinner • Family', 'fitness'],
  ['18:00', '19:30', 'Bunny Time', 'Park • Play • Dinner prep', 'family'],
  ['19:30', '21:00', 'Evening Sitting', 'Triphala • GoML • News • Speech • Journal', 'deep'],
  ['21:00', '21:30', 'Night Care', 'Meds • 5m steam • Brush', 'care'],
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'learning'],
  ['22:00', '23:59', 'Sleep', 'Lights out', 'rest'],
]

const WEEKDAY_FLOOR: Row[] = [
  ['06:00', '08:00', 'Home Morning', 'Wake • Stretch • Meditate • Light workout', 'fitness'],
  ['08:00', '09:30', 'Free & Ready', 'Bunny time • Protein shake • Bath', 'family'],
  ['09:30', '10:30', 'Morning Sitting', '1 hr focused work', 'deep'],
  ['10:30', '17:00', 'Breakfast & Office', 'Quick meal • Office • Back at 5:00', 'work'],
  ['17:00', '20:00', 'Dinner & Chill', 'Early dinner • Family • Bunny time', 'family'],
  ['20:00', '21:00', 'Evening Sitting', '1 hr: Journal • Speech • GoML', 'deep'],
  ['21:00', '21:30', 'Night Care', 'Meds • Triphala • 5m steam • Brush', 'care'],
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'learning'],
  ['22:00', '23:59', 'Sleep', 'Lights out', 'rest'],
]

const WEEKEND_CEILING: Row[] = [
  ['05:00', '05:15', 'Morning Reset', 'Jal neti • Warm water', 'health'],
  ['05:15', '06:15', 'Yoga & Mind', 'Stretch • Yoga • Meditate', 'mind'],
  ['06:15', '08:30', 'Gym', 'Leave ~6:30 • Back by 8:30', 'fitness'],
  ['08:30', '10:30', 'Slow Morning', 'Shake • Bunny • Scrub/Oil • Bath • Breakfast', 'health'],
  ['10:30', '13:30', 'Deep Block #1', '3 hrs • 45m Pomodoros', 'deep'],
  ['13:30', '15:30', 'Lunch & Nap', 'Lunch • Rest', 'meal'],
  ['15:30', '17:00', 'Deep Block #2', '1.5 hrs focused sitting', 'deep'],
  ['17:00', '18:00', 'Cardio & Dinner', '15–20m cardio • Early dinner', 'fitness'],
  ['18:00', '20:00', 'Play & Brain', 'Bunny • Chess • Math • Triphala 7:30', 'family'],
  ['20:00', '21:00', 'Evening Sitting', '1 hr: Journal • Speech • GoML', 'deep'],
  ['21:00', '21:30', 'Night Care', 'Meds • 5m steam • Brush', 'care'],
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'learning'],
  ['22:00', '23:59', 'Sleep', 'Lights out', 'rest'],
]

const WEEKEND_FLOOR: Row[] = [
  ['06:00', '08:00', 'Home Morning', 'Wake • Stretch • Meditate • Light workout', 'fitness'],
  ['08:00', '11:00', 'Free Morning', 'Bunny • Shake • Scrub/Oil • Bath • Breakfast', 'family'],
  ['11:00', '13:00', 'Light Sitting', '2 hrs study or build', 'deep'],
  ['13:00', '15:30', 'Lunch & Nap', 'Lunch • Rest', 'meal'],
  ['15:30', '17:00', 'Outing / Rest', 'Family outing or pure break', 'family'],
  ['17:00', '18:00', 'Early Dinner', 'Dinner • Optional walk', 'meal'],
  ['18:00', '21:00', 'Family & Fun', 'Bunny • Chess • Movie • Triphala 7:30', 'family'],
  ['21:00', '21:30', 'Night Care', 'Meds • 5m steam • Brush', 'care'],
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'learning'],
  ['22:00', '23:59', 'Sleep', 'Lights out', 'rest'],
]

export const defaultTemplates = (): Record<TemplateKey, Block[]> => ({
  'weekday-ceiling': build('wdc', WEEKDAY_CEILING),
  'weekday-floor': build('wdf', WEEKDAY_FLOOR),
  'weekend-ceiling': build('wec', WEEKEND_CEILING),
  'weekend-floor': build('wef', WEEKEND_FLOOR),
})

export const defaultHabits = (): Habit[] => [
  { id: 'meds', label: 'Meds', kind: 'daily', evening: true, facet: 'health' },
  { id: 'triphala', label: 'Triphala', kind: 'daily', nudgeAfter: '19:30', facet: 'health' },
  { id: 'steam', label: 'Steam', kind: 'daily', evening: true, facet: 'health' },
  { id: 'brush', label: 'Brush', kind: 'daily', evening: true, facet: 'health' },
  { id: 'eatright', label: 'Eat Right', kind: 'daily', facet: 'nutrition' },
  { id: 'exercise', label: 'Exercise', kind: 'daily', facet: 'fitness' },
  { id: 'besan', label: 'Besan Scrub', kind: 'weekly' },
  { id: 'oiling', label: 'Oiling', kind: 'weekly' },
]

export const defaultSettings = (): Settings => ({
  targets: { ceiling: 5, floor: 2, miss: 0 },
  theme: 'system',
  facetTargets: {},
  addedHabits: ['exercise'],
})

/** From the user's Daily High-Protein Meal Cheat Sheet. Options are made of foods so estimates scale with quantity. */
export const defaultMealPlan = (): MealPlan => ({
  waterGlasses: 12, // 3 L
  eatOutPerWeek: 1,
  targets: { kcal: [1450, 1650], protein: [110, 125], carbs: [110, 160], fat: [45, 60] },
  slots: [
    { id: 'jeera', time: '05:00', title: 'Jeera water', details: 'Jeera • Ajwain • Cinnamon', options: [{ id: 'jeera', label: 'Jeera-Ajwain-Cinnamon water', items: [{ food: 'jeera', qty: 1 }] }] },
    {
      id: 'pregym',
      time: '06:15',
      title: 'Pre-gym',
      details: 'Black coffee or ½ apple',
      options: [
        { id: 'coffee', label: 'Black coffee', items: [{ food: 'coffee', qty: 1 }] },
        { id: 'apple', label: '½ Apple', items: [{ food: 'apple', qty: 0.5 }] },
      ],
    },
    {
      id: 'shake',
      time: '08:30',
      title: 'Protein shake',
      details: 'Whey • Milk • Chana • Date • PB • Nuts',
      main: true,
      options: [
        {
          id: 'shake',
          label: 'Shake as planned',
          details: 'Whey + 200ml milk + 30g chana + 1 date + ½ tsp PB + nuts',
          items: [
            { food: 'whey', qty: 1 },
            { food: 'milk', qty: 1 },
            { food: 'chana', qty: 1 },
            { food: 'dates', qty: 1 },
            { food: 'pb', qty: 0.5 },
            { food: 'almond', qty: 3 },
          ],
        },
      ],
    },
    {
      id: 'eggs',
      time: '10:00',
      title: 'Eggs',
      details: 'Boiled eggs • or light swap',
      options: [
        { id: 'boiled', label: 'Boiled eggs', items: [{ food: 'egg', qty: 3 }], adjust: 'egg' },
        { id: 'swap', label: 'Light swap', details: '2 whole + 2 whites + ½ bowl poha/upma', items: [{ food: 'egg', qty: 2 }, { food: 'eggwhite', qty: 2 }, { food: 'poha', qty: 0.5 }] },
      ],
    },
    {
      id: 'salad',
      time: '12:00',
      title: 'Salad & nuts',
      details: 'Pick one or more salads',
      options: [
        { id: 'classic', label: 'Beet • Cucumber • Tomato', items: [{ food: 'saladclassic', qty: 1 }] },
        { id: 'sprouts', label: 'Sprouts & Carrot', items: [{ food: 'saladsprouts', qty: 1 }] },
        { id: 'spinach', label: 'Spinach & Amla', items: [{ food: 'saladspinach', qty: 1 }] },
        { id: 'pepper', label: 'Bell Pepper & Cabbage', items: [{ food: 'saladpepper', qty: 1 }] },
      ],
      addOns: [{ id: 'nuts', label: '4 almonds + 1 walnut', items: [{ food: 'almond', qty: 4 }, { food: 'walnut', qty: 1 }] }],
    },
    {
      id: 'lunch',
      time: '14:30',
      title: 'Lunch',
      details: 'Thali • Paneer • Chicken • Chilla',
      main: true,
      options: [
        { id: 'thali', label: 'Classic thali', details: '1 roti + dal + sabzi + curd w/ flax', items: [{ food: 'roti', qty: 1 }, { food: 'dal', qty: 1 }, { food: 'sabzi', qty: 1 }, { food: 'curd', qty: 1 }, { food: 'flax', qty: 1 }] },
        { id: 'paneer', label: 'High-protein veg', details: 'Dal + low-fat paneer + curd', items: [{ food: 'dal', qty: 1 }, { food: 'paneer', qty: 0.5 }, { food: 'curd', qty: 1 }] },
        { id: 'chicken', label: 'Chicken bowl', details: 'Roasted chicken + curd w/ flax', items: [{ food: 'chickenbreast', qty: 1.5 }, { food: 'curd', qty: 1 }, { food: 'flax', qty: 1 }] },
        { id: 'chilla', label: 'Chilla plate', details: '2 moong/besan chillas + curd w/ flax', items: [{ food: 'besanchilla', qty: 2 }, { food: 'curd', qty: 1 }, { food: 'flax', qty: 1 }] },
        { id: 'out', label: 'Ate out', details: 'Tandoori chicken/tikka + 1–2 roti + dal', eatingOut: true, items: [{ food: 'tandoori', qty: 1 }, { food: 'roti', qty: 1.5 }, { food: 'dal', qty: 1 }] },
        { id: 'other', label: 'Something else', offPlan: true },
      ],
    },
    {
      id: 'dinner',
      time: '18:00',
      title: 'Dinner + veggies',
      details: 'Chicken • Soya • Paneer • Eggs • Tofu',
      main: true,
      options: [
        { id: 'chicken', label: 'Chicken + veggies', details: 'Roasted chicken breast', items: [{ food: 'chickenbreast', qty: 1.5 }, { food: 'veggies', qty: 1 }] },
        { id: 'soya', label: 'Soya chunks + veggies', items: [{ food: 'soya', qty: 2 }, { food: 'veggies', qty: 1 }] },
        { id: 'paneer', label: 'Paneer tikka + veggies', details: 'Low-fat paneer', items: [{ food: 'paneer', qty: 1.25 }, { food: 'veggies', qty: 1 }] },
        { id: 'eggs', label: 'Egg bhurji + veggies', details: '1 whole + 4 whites', items: [{ food: 'egg', qty: 1 }, { food: 'eggwhite', qty: 4 }, { food: 'veggies', qty: 1 }] },
        { id: 'tofu', label: 'Tofu + veggies', details: 'Roasted tofu', items: [{ food: 'tofu', qty: 1.5 }, { food: 'veggies', qty: 1 }] },
        { id: 'light', label: 'Whey in water', details: 'Light dinner after eating out', afterEatingOut: true, items: [{ food: 'whey', qty: 1 }] },
        { id: 'hungcurd', label: 'Hung curd', details: 'Light dinner after eating out', afterEatingOut: true, items: [{ food: 'hungcurd', qty: 1 }] },
        { id: 'cheat', label: 'Cheat meal', details: 'Weekend treat • add what you had below', eatingOut: true },
        { id: 'other', label: 'Something else', offPlan: true },
      ],
    },
  ],
})

/** Fill in what newer versions add (food items, targets) without touching the user's edits. */
export function upgradeMealPlan(plan: MealPlan): MealPlan {
  const def = defaultMealPlan()
  const out: MealPlan = { ...plan, targets: plan.targets ?? def.targets }
  out.slots = plan.slots.map((slot) => {
    const ds = def.slots.find((d) => d.id === slot.id)
    if (!ds) return slot
    const options = slot.options.map((o) => {
      const dopt = ds.options.find((x) => x.id === o.id)
      return dopt && !o.items && dopt.items ? { ...o, items: dopt.items, adjust: o.adjust ?? dopt.adjust } : o
    })
    // newly added default options (e.g. Hung curd) appear once, after the user's own
    for (const dopt of ds.options) if (!options.some((o) => o.id === dopt.id) && dopt.id === 'hungcurd') options.splice(Math.max(0, options.length - 2), 0, dopt)
    const addOns = slot.addOns?.map((a) => (!a.items ? { ...a, items: ds.addOns?.find((x) => x.id === a.id)?.items } : a))
    return { ...slot, options, ...(addOns ? { addOns } : {}) }
  })
  return out
}

export const createDefaultData = (): AppData => ({
  version: 2,
  templates: defaultTemplates(),
  habits: defaultHabits(),
  days: {},
  weeks: {},
  goals: [],
  mealPlan: defaultMealPlan(),
  settings: defaultSettings(),
})

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  'weekday-ceiling': 'Weekday Ceiling',
  'weekday-floor': 'Weekday Floor',
  'weekend-ceiling': 'Weekend Ceiling',
  'weekend-floor': 'Weekend Floor',
}

export const CATEGORY_META: Record<Category, { label: string; dot: string }> = {
  deep: { label: 'Deep Work', dot: 'bg-blue-700' },
  fitness: { label: 'Fitness', dot: 'bg-teal-600' },
  mind: { label: 'Mindfulness', dot: 'bg-orange-700' },
  learning: { label: 'Reading', dot: 'bg-lime-600' },
  health: { label: 'Health', dot: 'bg-cyan-500' },
  care: { label: 'Self-care', dot: 'bg-cyan-300' },
  family: { label: 'Family', dot: 'bg-pink-500' },
  meal: { label: 'Meals', dot: 'bg-yellow-700' },
  work: { label: 'Office', dot: 'bg-slate-400' },
  rest: { label: 'Sleep', dot: 'bg-slate-600' },
}

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[]

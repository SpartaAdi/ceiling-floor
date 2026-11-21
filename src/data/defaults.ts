import type { AppData, Block, Category, Habit, Settings, TemplateKey } from '../types'

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
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'mind'],
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
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'mind'],
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
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'mind'],
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
  ['21:30', '22:00', 'Reading', 'Kindle or physical book', 'mind'],
  ['22:00', '23:59', 'Sleep', 'Lights out', 'rest'],
]

export const defaultTemplates = (): Record<TemplateKey, Block[]> => ({
  'weekday-ceiling': build('wdc', WEEKDAY_CEILING),
  'weekday-floor': build('wdf', WEEKDAY_FLOOR),
  'weekend-ceiling': build('wec', WEEKEND_CEILING),
  'weekend-floor': build('wef', WEEKEND_FLOOR),
})

export const defaultHabits = (): Habit[] => [
  { id: 'meds', label: 'Meds', kind: 'daily', evening: true },
  { id: 'triphala', label: 'Triphala', kind: 'daily', nudgeAfter: '19:30' },
  { id: 'steam', label: 'Steam', kind: 'daily', evening: true },
  { id: 'brush', label: 'Brush', kind: 'daily', evening: true },
  { id: 'besan', label: 'Besan Scrub', kind: 'weekly' },
  { id: 'oiling', label: 'Oiling', kind: 'weekly' },
]

export const defaultSettings = (): Settings => ({
  targets: { ceiling: 5, floor: 2, miss: 0 },
  theme: 'system',
})

export const createDefaultData = (): AppData => ({
  version: 1,
  templates: defaultTemplates(),
  habits: defaultHabits(),
  days: {},
  weeks: {},
  settings: defaultSettings(),
})

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  'weekday-ceiling': 'Weekday Ceiling',
  'weekday-floor': 'Weekday Floor',
  'weekend-ceiling': 'Weekend Ceiling',
  'weekend-floor': 'Weekend Floor',
}

export const CATEGORY_META: Record<Category, { label: string; dot: string }> = {
  mind: { label: 'Mind', dot: 'bg-sky-400' },
  fitness: { label: 'Fitness', dot: 'bg-emerald-400' },
  health: { label: 'Health', dot: 'bg-teal-400' },
  work: { label: 'Work', dot: 'bg-slate-400' },
  deep: { label: 'Deep Work', dot: 'bg-blue-500' },
  meal: { label: 'Meal', dot: 'bg-orange-400' },
  family: { label: 'Family', dot: 'bg-pink-400' },
  care: { label: 'Care', dot: 'bg-cyan-400' },
  rest: { label: 'Rest', dot: 'bg-slate-300' },
}

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[]

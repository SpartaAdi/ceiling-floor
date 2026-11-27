export type DayMode = 'ceiling' | 'floor' | 'miss'
export type DayType = 'weekday' | 'weekend'
export type TemplateKey = 'weekday-ceiling' | 'weekday-floor' | 'weekend-ceiling' | 'weekend-floor'
export type BlockStatus = 'completed' | 'missed'

export type Category =
  | 'deep'
  | 'fitness'
  | 'mind'
  | 'learning'
  | 'health'
  | 'care'
  | 'family'
  | 'meal'
  | 'work'
  | 'rest'

/** Major life areas the dashboard reports on. */
export type FacetId = 'deep' | 'fitness' | 'mind' | 'learning' | 'family' | 'health' | 'nutrition' | 'sleep'

export interface Block {
  id: string
  start: string // HH:MM
  end: string // HH:MM ("23:59" = end of day)
  title: string
  details: string
  category: Category
}

export type HabitKind = 'daily' | 'weekly'

export interface Habit {
  id: string
  label: string
  kind: HabitKind
  /** Shown inside the active Night Care card after 21:00 if unticked */
  evening?: boolean
  /** HH:MM after which an unticked habit is subtly highlighted */
  nudgeAfter?: string
  /** Life facet this habit feeds into */
  facet?: FacetId
}

export interface Reflection {
  win?: string // something positive today
  grateful?: string
  lesson?: string // a lesson to keep
  bother?: string // something bothering me
  why?: string // why it bothers me
  focus?: string // tomorrow's one focus
}

export interface DayLog {
  date: string // YYYY-MM-DD
  mode?: DayMode
  /** Mode chosen in advance for a future day; auto-applied when the day arrives */
  plan?: DayMode
  missReason?: string
  /** Template the snapshot came from */
  template?: TemplateKey
  /** Snapshot of blocks for this day — protects history from template edits */
  blocks: Block[]
  statuses: Record<string, BlockStatus>
  habits: Record<string, boolean>
  /** Meal plan check-offs by slot id */
  meals?: Record<string, MealLog>
  /** Water glasses (250 ml) */
  water?: number
  /** 1 (drained) – 5 (great) */
  energy?: number
  reflection?: Reflection
  updatedAt: number
  /** Created by the demo-data loader */
  demo?: boolean
}

export interface WeekReview {
  /** 1–5 overall week rating */
  rating?: number
  wentWell?: string
  blockers?: string
  change?: string
  completedAt?: number
  demo?: boolean
}

export interface WeekPriority {
  facet: FacetId
  note: string
}

export interface WeekPlan {
  /** Up to 3 focus areas for this week, set during the previous week's review */
  priorities: WeekPriority[]
  demo?: boolean
}

export interface WeekLog {
  weekStart: string // Monday YYYY-MM-DD
  /** Set automatically on change; used to merge across devices */
  updatedAt?: number
  /** weekly habit id -> date it was done */
  care: Record<string, string | undefined>
  review?: WeekReview
  plan?: WeekPlan
}

/** hours = facet time • sessions = days with a done facet block • habit = days a habit was kept • manual = you count */
export type GoalKind = 'hours' | 'sessions' | 'habit' | 'manual'
export type GoalPeriod = 'week' | 'month' | 'custom'

export interface Goal {
  id: string
  facet: FacetId
  title: string
  kind: GoalKind
  target: number
  period: GoalPeriod
  /** For kind = habit */
  habitId?: string
  /** For period = custom */
  start?: string
  end?: string
  /** Manual progress keyed by period start date ('custom' for custom goals) */
  manual?: Record<string, number>
  createdAt: string
  archived?: boolean
  demo?: boolean
}

export interface Targets {
  ceiling: number
  floor: number
  miss: number
}

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  targets: Targets
  theme: Theme
  /** Weekly hour targets per hours-facet; missing = auto from templates */
  facetTargets: Partial<Record<FacetId, number>>
  /** Daily reminder times (synced) */
  reminders?: Reminders
  /** Default habits already offered once (so deleting one sticks) */
  addedHabits?: string[]
  /** First-run checklist dismissed */
  onboardingDone?: boolean
  demoLoaded?: boolean
}

/** Bookkeeping for cross-device sync (set automatically, never by hand). */
export interface SyncMeta {
  /** Last-change time per whole section */
  sections: Partial<Record<'templates' | 'habits' | 'goals' | 'settings' | 'mealPlan', number>>
  /** Deletion times, e.g. "day:2026-11-18" or "week:2026-11-16" */
  tombstones: Record<string, number>
}

export interface Reminders {
  morning: string // HH:MM
  evening: string // HH:MM
}

/** One choice within a meal slot (no calories/grams by design: this is an adherence check). */
export interface MealOption {
  id: string
  label: string
  details?: string
  /** Not part of the plan (e.g. "Something else") */
  offPlan?: boolean
  /** Counts against the weekly eating-out allowance */
  eatingOut?: boolean
  /** Planned light meal for after eating out */
  afterEatingOut?: boolean
  /** What it's made of (food id + quantity in that food's unit) — used for estimates */
  items?: { food: string; qty: number }[]
  /** Food whose count the user adjusts directly (e.g. eggs: 2, 3, 4) */
  adjust?: string
}

export interface MealSlot {
  id: string
  time: string // HH:MM
  title: string
  details?: string
  options: MealOption[]
  /** Optional extras ticked alongside, e.g. the nuts with the salad */
  addOns?: { id: string; label: string; items?: { food: string; qty: number }[] }[]
  /** Skipping or going off-plan here means Eat Right is not met */
  main?: boolean
}

export interface MealPlan {
  slots: MealSlot[]
  /** Daily water target in 250 ml glasses */
  waterGlasses: number
  /** Eating-out / cheat meals allowed per week */
  eatOutPerWeek: number
  /** Daily estimate targets (from the meal cheat sheet) */
  targets?: { kcal: [number, number]; protein: [number, number]; carbs: [number, number]; fat: [number, number] }
}

export interface LoggedFood {
  /** Food list id when recognised; otherwise just a note */
  food?: string
  name: string
  qty: number
}

export interface MealLog {
  status: 'done' | 'skipped'
  /** Selected plan options (multi-select) */
  optionIds?: string[]
  /** Older single-choice logs */
  optionId?: string
  /** Per option: count of its adjustable food, or a serving multiplier */
  servings?: Record<string, number>
  addOns?: string[]
  /** Foods typed in your own words */
  extras?: LoggedFood[]
  text?: string
}

export interface AppData {
  version: 2
  meta?: SyncMeta
  mealPlan: MealPlan
  templates: Record<TemplateKey, Block[]>
  habits: Habit[]
  days: Record<string, DayLog>
  weeks: Record<string, WeekLog>
  goals: Goal[]
  settings: Settings
}

export type WeekHealth = 'green' | 'amber' | 'red'

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
  demoLoaded?: boolean
}

export interface AppData {
  version: 2
  templates: Record<TemplateKey, Block[]>
  habits: Habit[]
  days: Record<string, DayLog>
  weeks: Record<string, WeekLog>
  goals: Goal[]
  settings: Settings
}

export type WeekHealth = 'green' | 'amber' | 'red'

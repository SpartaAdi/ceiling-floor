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
  win?: string
  lesson?: string
  focus?: string // tomorrow's one focus
}

export interface DayLog {
  date: string // YYYY-MM-DD
  mode?: DayMode
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

export interface WeekLog {
  weekStart: string // Monday YYYY-MM-DD
  /** weekly habit id -> date it was done */
  care: Record<string, string | undefined>
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
  settings: Settings
}

export type WeekHealth = 'green' | 'amber' | 'red'

import type { LucideIcon } from 'lucide-react'
import { BookOpen, Brain, Dumbbell, Heart, HeartPulse, Leaf, Moon, Salad } from 'lucide-react'
import type { AppData, Block, Category, FacetId, TemplateKey } from '../types'
import { toMin } from './time'

export interface FacetDef {
  id: FacetId
  label: string
  sub: string
  /** hours = time invested; adherence = % kept (blocks + linked habits) */
  metric: 'hours' | 'adherence'
  categories: Category[]
  color: string
  /** Counts toward "Growth Hours" */
  growth: boolean
  Icon: LucideIcon
}

export const FACETS: FacetDef[] = [
  { id: 'deep', label: 'Deep Work', sub: 'Build • Study • Create', metric: 'hours', categories: ['deep'], color: '#1D4ED8', growth: true, Icon: Brain },
  { id: 'fitness', label: 'Fitness', sub: 'Gym • Cardio • Move', metric: 'hours', categories: ['fitness'], color: '#0F9F8F', growth: true, Icon: Dumbbell },
  { id: 'mind', label: 'Mindfulness', sub: 'Yoga • Meditate', metric: 'hours', categories: ['mind'], color: '#C2410C', growth: true, Icon: Leaf },
  { id: 'learning', label: 'Reading', sub: 'Books • Kindle', metric: 'hours', categories: ['learning'], color: '#65A30D', growth: true, Icon: BookOpen },
  { id: 'family', label: 'Family', sub: 'Bunny • Family time', metric: 'hours', categories: ['family'], color: '#DB2777', growth: false, Icon: Heart },
  { id: 'health', label: 'Health & Care', sub: 'Rituals • Meds • Care', metric: 'adherence', categories: ['health', 'care'], color: '#0891B2', growth: false, Icon: HeartPulse },
  { id: 'nutrition', label: 'Nutrition', sub: 'Eat right • Meals', metric: 'adherence', categories: ['meal'], color: '#A16207', growth: false, Icon: Salad },
  { id: 'sleep', label: 'Sleep', sub: 'Lights out on time', metric: 'adherence', categories: ['rest'], color: '#475569', growth: false, Icon: Moon },
]

export const FACET_BY_ID = Object.fromEntries(FACETS.map((f) => [f.id, f])) as Record<FacetId, FacetDef>
export const HOUR_FACETS = FACETS.filter((f) => f.metric === 'hours')
export const GROWTH_FACETS = FACETS.filter((f) => f.growth)
export const ADHERENCE_TARGET = 80

export const facetOfCategory = (c: Category): FacetId | undefined => FACETS.find((f) => f.categories.includes(c))?.id

export const blockMinutes = (b: Block) => Math.max(0, toMin(b.end, true) - toMin(b.start))

const minutesByFacet = (blocks: Block[]) => {
  const out: Partial<Record<FacetId, number>> = {}
  for (const b of blocks) {
    const f = facetOfCategory(b.category)
    if (f) out[f] = (out[f] ?? 0) + blockMinutes(b)
  }
  return out
}

/**
 * Weekly hours a "Green week" implies: Ceiling share of an all-Ceiling week
 * plus Floor share of an all-Floor week, using the current templates.
 */
export function autoFacetTargets(data: AppData): Record<FacetId, number> {
  const tpl = (k: TemplateKey) => minutesByFacet(data.templates[k])
  const [wdc, wec, wdf, wef] = [tpl('weekday-ceiling'), tpl('weekend-ceiling'), tpl('weekday-floor'), tpl('weekend-floor')]
  const { ceiling, floor } = data.settings.targets
  const out = {} as Record<FacetId, number>
  for (const f of FACETS) {
    const weekC = 5 * (wdc[f.id] ?? 0) + 2 * (wec[f.id] ?? 0)
    const weekF = 5 * (wdf[f.id] ?? 0) + 2 * (wef[f.id] ?? 0)
    const mins = (ceiling / 7) * weekC + (floor / 7) * weekF
    out[f.id] = Math.round((mins / 60) * 2) / 2
  }
  return out
}

export function facetTargets(data: AppData): Record<FacetId, number> {
  return { ...autoFacetTargets(data), ...data.settings.facetTargets } as Record<FacetId, number>
}

export const fmtH = (h: number) => {
  const r = Math.round(h * 10) / 10
  return `${Number.isInteger(r) ? r : r.toFixed(1)}h`
}

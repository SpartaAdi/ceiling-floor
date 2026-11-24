import type { AppData, Block, TemplateKey } from '../types'
import { createDefaultData } from '../data/defaults'

/**
 * Storage adapter contract. Async on purpose so a remote backend
 * (e.g. Supabase) can be dropped in without touching the UI layer.
 */
export interface StorageAdapter {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
}

export const STORAGE_KEY = 'cfm:data:v1'

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key = STORAGE_KEY) {}

  async load() {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? normalize(JSON.parse(raw)) : null
    } catch {
      return null
    }
  }

  async save(data: AppData) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data))
    } catch (err) {
      console.error('Save failed', err)
    }
  }

  async clear() {
    try {
      localStorage.removeItem(this.key)
    } catch {
      /* storage unavailable */
    }
  }
}

// Swap this single line to plug in another backend later.
export const storage: StorageAdapter = new LocalStorageAdapter()

const TEMPLATE_KEYS: TemplateKey[] = ['weekday-ceiling', 'weekday-floor', 'weekend-ceiling', 'weekend-floor']

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Validate + fill gaps so older or hand-edited backups still load. Throws on garbage. */
export function normalize(input: unknown): AppData {
  if (!isObj(input)) throw new Error('Not a valid backup file')
  const base = createDefaultData()
  const templates = { ...base.templates }
  if (isObj(input.templates)) {
    for (const k of TEMPLATE_KEYS) {
      const t = input.templates[k]
      if (Array.isArray(t)) templates[k] = t as AppData['templates'][TemplateKey]
    }
  }
  const settingsIn = isObj(input.settings) ? input.settings : {}
  const targetsIn = isObj(settingsIn.targets) ? settingsIn.targets : {}
  const out: AppData = {
    version: 2,
    templates,
    habits: Array.isArray(input.habits) ? (input.habits as AppData['habits']) : base.habits,
    days: isObj(input.days) ? (input.days as AppData['days']) : {},
    weeks: isObj(input.weeks) ? (input.weeks as AppData['weeks']) : {},
    goals: Array.isArray(input.goals) ? (input.goals as AppData['goals']) : [],
    settings: {
      ...base.settings,
      ...(settingsIn as Partial<AppData['settings']>),
      targets: { ...base.settings.targets, ...(targetsIn as Partial<AppData['settings']['targets']>) },
      facetTargets: isObj(settingsIn.facetTargets) ? (settingsIn.facetTargets as AppData['settings']['facetTargets']) : {},
    },
  }
  if (isObj(input.meta)) {
    const m = input.meta as Partial<NonNullable<AppData['meta']>>
    out.meta = { sections: isObj(m.sections) ? m.sections : {}, tombstones: isObj(m.tombstones) ? (m.tombstones as Record<string, number>) : {} }
  }
  if (input.version !== 2) migrateToV2(out)
  return out
}

/** v1 → v2: Reading gets its own category; habits gain facets; Eat Right added. */
function migrateToV2(d: AppData) {
  const fixBlocks = (blocks: Block[]) =>
    blocks.forEach((b) => {
      if (b.category === 'mind' && /read/i.test(b.title)) b.category = 'learning'
    })
  Object.values(d.templates).forEach(fixBlocks)
  Object.values(d.days).forEach((day) => fixBlocks(day.blocks))
  const defaults = createDefaultData().habits
  for (const h of d.habits) {
    const def = defaults.find((x) => x.id === h.id)
    if (def?.facet && !h.facet) h.facet = def.facet
  }
  if (!d.habits.some((h) => h.id === 'eatright')) {
    const eat = defaults.find((h) => h.id === 'eatright')!
    const lastDaily = d.habits.map((h) => h.kind).lastIndexOf('daily')
    d.habits.splice(lastDaily + 1, 0, eat)
  }
}

export function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `routine-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function importJSON(file: File): Promise<AppData> {
  const text = await file.text()
  return normalize(JSON.parse(text))
}

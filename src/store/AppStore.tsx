import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Block, BlockStatus, DayLog, DayMode, Habit, TemplateKey, Targets, Theme } from '../types'
import { createDefaultData, defaultHabits, defaultTemplates } from '../data/defaults'
import { storage } from '../services/storageService'
import { templateFor, toKey, toMin, weekStartOf } from '../lib/time'
import { withDemoData, withoutDemoData } from '../lib/demo'

type Draft = (d: AppData) => void

interface Store {
  data: AppData
  ready: boolean
  toast: string | null
  notify: (msg: string) => void
  /** Template used to preview a day that has no snapshot yet */
  previewBlocks: (date: string) => { template: TemplateKey; blocks: Block[] }
  setDayMode: (date: string, mode: DayMode) => void
  resetDay: (date: string) => void
  setBlockStatus: (date: string, blockId: string, status: BlockStatus) => void
  toggleBlock: (date: string, blockId: string) => void
  setMissReason: (date: string, reason: string) => void
  toggleHabit: (date: string, habitId: string) => void
  toggleCare: (date: string, habitId: string) => void
  upsertBlock: (tk: TemplateKey, block: Block) => void
  deleteBlock: (tk: TemplateKey, id: string) => void
  resetTemplate: (tk: TemplateKey) => void
  upsertHabit: (habit: Habit) => void
  deleteHabit: (id: string) => void
  resetHabits: () => void
  setTargets: (t: Targets) => void
  setTheme: (t: Theme) => void
  replaceAll: (d: AppData) => void
  loadDemo: () => void
  removeDemo: () => void
  clearAll: () => void
}

const Ctx = createContext<Store | null>(null)

const sortBlocks = (b: Block[]) => [...b].sort((x, y) => toMin(x.start) - toMin(y.start))

const ensureDay = (d: AppData, date: string): DayLog =>
  (d.days[date] ??= { date, blocks: [], statuses: {}, habits: {}, updatedAt: Date.now() })

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultData)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    storage.load().then((loaded) => {
      if (loaded) setData(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (ready) void storage.save(data)
  }, [data, ready])

  const mutate = useCallback((fn: Draft) => {
    setData((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const previewBlocks = useCallback(
    (date: string) => {
      const tk = templateFor(date, 'ceiling')
      return { template: tk, blocks: data.templates[tk] }
    },
    [data.templates],
  )

  const store = useMemo<Store>(() => {
    /** Snapshot the ceiling preview so pre-mode logs have something to attach to. */
    const ensureSnapshot = (d: AppData, date: string) => {
      const day = ensureDay(d, date)
      if (!day.blocks.length) {
        const tk = templateFor(date, 'ceiling')
        day.blocks = structuredClone(d.templates[tk])
        day.template = tk
      }
      return day
    }

    return {
      data,
      ready,
      toast,
      notify,
      previewBlocks,

      setDayMode: (date, mode) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          const tk = templateFor(date, mode)
          // Keep catch-up logs if they were made against the same template before a mode was picked
          const keep = !day.mode && day.template === tk ? day.statuses : {}
          day.blocks = structuredClone(d.templates[tk])
          day.template = tk
          day.mode = mode
          const fill: BlockStatus = mode === 'miss' ? 'missed' : 'completed'
          day.statuses = Object.fromEntries(day.blocks.map((b) => [b.id, keep[b.id] ?? fill]))
          if (mode !== 'miss') delete day.missReason
          day.updatedAt = Date.now()
        }),

      resetDay: (date) =>
        mutate((d) => {
          const day = d.days[date]
          if (!day) return
          day.mode = undefined
          day.template = undefined
          day.blocks = []
          day.statuses = {}
          delete day.missReason
          day.updatedAt = Date.now()
        }),

      setBlockStatus: (date, blockId, status) =>
        mutate((d) => {
          const day = ensureSnapshot(d, date)
          day.statuses[blockId] = status
          day.updatedAt = Date.now()
        }),

      toggleBlock: (date, blockId) =>
        mutate((d) => {
          const day = ensureSnapshot(d, date)
          const cur = day.statuses[blockId]
          day.statuses[blockId] = cur === 'completed' ? 'missed' : 'completed'
          day.updatedAt = Date.now()
        }),

      setMissReason: (date, reason) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          day.missReason = reason.slice(0, 40)
          day.updatedAt = Date.now()
        }),

      toggleHabit: (date, habitId) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          day.habits[habitId] = !day.habits[habitId]
          day.updatedAt = Date.now()
        }),

      toggleCare: (date, habitId) =>
        mutate((d) => {
          const ws = weekStartOf(date)
          const week = (d.weeks[ws] ??= { weekStart: ws, care: {} })
          if (week.care[habitId]) delete week.care[habitId]
          else week.care[habitId] = date
        }),

      upsertBlock: (tk, block) =>
        mutate((d) => {
          const list = d.templates[tk].filter((b) => b.id !== block.id)
          d.templates[tk] = sortBlocks([...list, block])
        }),

      deleteBlock: (tk, id) =>
        mutate((d) => {
          d.templates[tk] = d.templates[tk].filter((b) => b.id !== id)
        }),

      resetTemplate: (tk) =>
        mutate((d) => {
          d.templates[tk] = defaultTemplates()[tk]
        }),

      upsertHabit: (habit) =>
        mutate((d) => {
          const i = d.habits.findIndex((h) => h.id === habit.id)
          if (i >= 0) d.habits[i] = habit
          else d.habits.push(habit)
        }),

      deleteHabit: (id) =>
        mutate((d) => {
          d.habits = d.habits.filter((h) => h.id !== id)
        }),

      resetHabits: () =>
        mutate((d) => {
          d.habits = defaultHabits()
        }),

      setTargets: (t) =>
        mutate((d) => {
          d.settings.targets = t
        }),

      setTheme: (t) =>
        mutate((d) => {
          d.settings.theme = t
        }),

      replaceAll: (next) => setData(next),
      loadDemo: () => setData((prev) => withDemoData(prev, toKey(new Date()))),
      removeDemo: () => setData((prev) => withoutDemoData(prev)),
      clearAll: () => {
        void storage.clear()
        setData(createDefaultData())
      },
    }
  }, [data, ready, toast, notify, previewBlocks, mutate])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside AppStoreProvider')
  return s
}

/** Blocks to render for a day: its snapshot if one exists, else the ceiling preview. */
export function useDayView(date: string) {
  const { data, previewBlocks } = useStore()
  const day = data.days[date]
  const snapshot = day && day.blocks.length > 0
  const { blocks, template } = snapshot ? { blocks: day.blocks, template: day.template } : previewBlocks(date)
  return { day, blocks, template, isPreview: !snapshot }
}

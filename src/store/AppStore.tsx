import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Block, BlockStatus, DayMode, FacetId, Goal, Habit, Reflection, TemplateKey, Targets, Theme, WeekPriority, WeekReview } from '../types'
import { createDefaultData, defaultHabits, defaultTemplates } from '../data/defaults'
import { storage } from '../services/storageService'
import { templateFor, toKey, toMin, weekStartOf } from '../lib/time'
import { applyDayMode, ensureDay, ensureSnapshot, resetDayLog, setDayPlan } from '../lib/dayLogic'
import { periodFor } from '../lib/goals'
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
  setPlan: (date: string, mode: DayMode | undefined) => void
  setBlockStatus: (date: string, blockId: string, status: BlockStatus) => void
  toggleBlock: (date: string, blockId: string) => void
  clearBlockStatus: (date: string, blockId: string) => void
  setEnergy: (date: string, energy: number | undefined) => void
  setReflection: (date: string, field: keyof Reflection, text: string) => void
  setFacetTarget: (id: FacetId, hours: number | undefined) => void
  upsertGoal: (goal: Goal) => void
  deleteGoal: (id: string) => void
  setGoalArchived: (id: string, archived: boolean) => void
  bumpGoal: (id: string, ref: string, delta: number) => void
  setReview: (ws: string, patch: Partial<WeekReview>) => void
  setPriorities: (ws: string, priorities: WeekPriority[]) => void
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
    return {
      data,
      ready,
      toast,
      notify,
      previewBlocks,

      setDayMode: (date, mode) => mutate((d) => applyDayMode(d, date, mode)),

      resetDay: (date) => mutate((d) => resetDayLog(d, date)),

      setPlan: (date, mode) => mutate((d) => setDayPlan(d, date, mode)),

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

      clearBlockStatus: (date, blockId) =>
        mutate((d) => {
          const day = d.days[date]
          if (!day) return
          delete day.statuses[blockId]
          day.updatedAt = Date.now()
        }),

      setEnergy: (date, energy) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          day.energy = energy
          day.updatedAt = Date.now()
        }),

      setReflection: (date, field, text) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          const r = (day.reflection ??= {})
          const v = text.trim().slice(0, 5000)
          if (v) r[field] = v
          else delete r[field]
          day.updatedAt = Date.now()
        }),

      setFacetTarget: (id, hours) =>
        mutate((d) => {
          if (hours === undefined) delete d.settings.facetTargets[id]
          else d.settings.facetTargets[id] = Math.max(0, Math.round(hours * 2) / 2)
        }),

      upsertGoal: (goal) =>
        mutate((d) => {
          const i = d.goals.findIndex((g) => g.id === goal.id)
          if (i >= 0) d.goals[i] = goal
          else d.goals.push(goal)
        }),

      deleteGoal: (id) =>
        mutate((d) => {
          d.goals = d.goals.filter((g) => g.id !== id)
        }),

      setGoalArchived: (id, archived) =>
        mutate((d) => {
          const g = d.goals.find((x) => x.id === id)
          if (g) g.archived = archived || undefined
        }),

      bumpGoal: (id, ref, delta) =>
        mutate((d) => {
          const g = d.goals.find((x) => x.id === id)
          if (!g) return
          const key = periodFor(g, ref).key
          const m = (g.manual ??= {})
          m[key] = Math.max(0, (m[key] ?? 0) + delta)
        }),

      setReview: (ws, patch) =>
        mutate((d) => {
          const week = (d.weeks[ws] ??= { weekStart: ws, care: {} })
          const r = { ...week.review, ...patch }
          for (const k of Object.keys(r) as (keyof WeekReview)[]) if (r[k] === undefined || r[k] === '') delete r[k]
          week.review = r
        }),

      setPriorities: (ws, priorities) =>
        mutate((d) => {
          const week = (d.weeks[ws] ??= { weekStart: ws, care: {} })
          week.plan = { priorities: priorities.slice(0, 3) }
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
  const plannedTk = !snapshot && day?.plan ? templateFor(date, day.plan) : undefined
  const { blocks, template } = snapshot
    ? { blocks: day.blocks, template: day.template }
    : plannedTk
      ? { blocks: data.templates[plannedTk], template: plannedTk }
      : previewBlocks(date)
  return { day, blocks, template, isPreview: !snapshot }
}

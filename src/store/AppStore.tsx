import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Block, BlockStatus, DayMode, FacetId, FoodEntry, Goal, Habit, MealLog, MealPlan, Reflection, Reminders, Targets, TemplateKey, Theme, WeekPriority, WeekReview } from '../types'
import { createDefaultData, defaultHabits, defaultTemplates } from '../data/defaults'
import { storage } from '../services/storageService'
import { templateFor, toKey, toMin, weekStartOf } from '../lib/time'
import { applyDayMode, ensureDay, ensureSnapshot, resetDayLog, setDayPlan } from '../lib/dayLogic'
import { periodFor } from '../lib/goals'
import { syncEatRight, syncExercise } from '../lib/diet'
import { defaultMealPlan } from '../data/defaults'
import { mergeData, stampChanges } from '../sync/merge'
import { withDemoData, withoutDemoData } from '../lib/demo'
import { setCustomFoods, type Food } from '../data/foods'

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
  setReminders: (r: Reminders) => void
  setOnboardingDone: (done: boolean) => void
  logMeal: (date: string, slotId: string, log: MealLog | undefined) => void
  setWater: (date: string, glasses: number) => void
  /** Timed food log (anything outside the planned meals) */
  addFoodEntries: (date: string, entries: Omit<FoodEntry, 'id'>[]) => void
  updateFoodEntry: (date: string, entry: FoodEntry) => void
  deleteFoodEntry: (date: string, id: string) => void
  /** Save a food to your personal list (made from ingredients or like a listed food) */
  saveMyFood: (food: Food) => void
  deleteMyFood: (id: string) => void
  setMealPlan: (plan: MealPlan) => void
  resetMealPlan: () => void
  /** Merge data that came from another device (sync only) */
  applyRemote: (d: AppData) => void
}

const Ctx = createContext<Store | null>(null)

const sortBlocks = (b: Block[]) => [...b].sort((x, y) => toMin(x.start) - toMin(y.start))

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultData)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  // Personal foods are searchable/estimable everywhere (cheap; runs on every render)
  setCustomFoods(data.myFoods)

  useEffect(() => {
    storage.load().then((loaded) => {
      if (loaded) setData(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (ready) void storage.save(data)
  }, [data, ready])

  /** Every local change goes through here so it is stamped for cross-device sync. */
  const commit = useCallback((make: (prev: AppData) => AppData) => {
    setData((prev) => stampChanges(prev, make(prev), Date.now()))
  }, [])

  const mutate = useCallback(
    (fn: Draft) =>
      commit((prev) => {
        const next = structuredClone(prev)
        fn(next)
        return next
      }),
    [commit],
  )

  /** Data arriving from the cloud: merged with whatever changed locally meanwhile, never re-stamped. */
  const applyRemote = useCallback((incoming: AppData) => setData((prev) => mergeData(prev, incoming)), [])

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

      setDayMode: (date, mode) =>
        mutate((d) => {
          applyDayMode(d, date, mode)
          syncExercise(d, date)
        }),

      resetDay: (date) => mutate((d) => resetDayLog(d, date)),

      setPlan: (date, mode) => mutate((d) => setDayPlan(d, date, mode)),

      setBlockStatus: (date, blockId, status) =>
        mutate((d) => {
          const day = ensureSnapshot(d, date)
          day.statuses[blockId] = status
          day.updatedAt = Date.now()
          syncExercise(d, date)
        }),

      toggleBlock: (date, blockId) =>
        mutate((d) => {
          const day = ensureSnapshot(d, date)
          const cur = day.statuses[blockId]
          day.statuses[blockId] = cur === 'completed' ? 'missed' : 'completed'
          day.updatedAt = Date.now()
          syncExercise(d, date)
        }),

      clearBlockStatus: (date, blockId) =>
        mutate((d) => {
          const day = d.days[date]
          if (!day) return
          delete day.statuses[blockId]
          day.updatedAt = Date.now()
          syncExercise(d, date)
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

      logMeal: (date, slotId, log) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          const meals = (day.meals ??= {})
          if (log) meals[slotId] = log
          else delete meals[slotId]
          day.updatedAt = Date.now()
          syncEatRight(d, date)
        }),

      setWater: (date, glasses) =>
        mutate((d) => {
          const day = ensureDay(d, date)
          day.water = Math.max(0, Math.min(30, glasses))
          day.updatedAt = Date.now()
        }),

      addFoodEntries: (date, entries) =>
        mutate((d) => {
          if (!entries.length) return
          const day = ensureDay(d, date)
          const list = (day.foodLog ??= [])
          for (const e of entries) list.push({ ...e, id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` })
          list.sort((a, b) => a.time.localeCompare(b.time))
          day.updatedAt = Date.now()
          syncEatRight(d, date)
        }),

      updateFoodEntry: (date, entry) =>
        mutate((d) => {
          const day = d.days[date]
          if (!day?.foodLog) return
          day.foodLog = day.foodLog.map((e) => (e.id === entry.id ? entry : e)).sort((a, b) => a.time.localeCompare(b.time))
          day.updatedAt = Date.now()
          syncEatRight(d, date)
        }),

      deleteFoodEntry: (date, id) =>
        mutate((d) => {
          const day = d.days[date]
          if (!day?.foodLog) return
          day.foodLog = day.foodLog.filter((e) => e.id !== id)
          if (!day.foodLog.length) delete day.foodLog
          day.updatedAt = Date.now()
          syncEatRight(d, date)
        }),

      saveMyFood: (food) =>
        mutate((d) => {
          const list = (d.myFoods ??= [])
          const i = list.findIndex((x) => x.id === food.id)
          if (i >= 0) list[i] = food
          else list.unshift(food)
        }),

      deleteMyFood: (id) =>
        mutate((d) => {
          d.myFoods = (d.myFoods ?? []).filter((x) => x.id !== id)
          if (!d.myFoods.length) delete d.myFoods
        }),

      setMealPlan: (plan) =>
        mutate((d) => {
          d.mealPlan = plan
        }),

      resetMealPlan: () =>
        mutate((d) => {
          d.mealPlan = defaultMealPlan()
        }),

      setOnboardingDone: (done) =>
        mutate((d) => {
          d.settings.onboardingDone = done || undefined
        }),

      setReminders: (r) =>
        mutate((d) => {
          d.settings.reminders = r
        }),

      replaceAll: (next) => commit((prev) => ({ ...next, meta: prev.meta })),
      loadDemo: () => commit((prev) => withDemoData(prev, toKey(new Date()))),
      removeDemo: () => commit((prev) => withoutDemoData(prev)),
      clearAll: () => commit((prev) => ({ ...createDefaultData(), meta: prev.meta })),
      applyRemote,
    }
  }, [data, ready, toast, notify, previewBlocks, mutate, commit, applyRemote])

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

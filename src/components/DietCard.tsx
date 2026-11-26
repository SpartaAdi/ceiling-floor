import { useState } from 'react'
import { Check, ChevronRight, Droplets, Minus, Plus, Salad, Utensils, X } from 'lucide-react'
import type { MealLog, MealSlot } from '../types'
import { useStore } from '../store/AppStore'
import { allowedEatOuts, currentSlotId, daySummary, eatOutsInWeek, mealState, optionOf, type MealState } from '../lib/diet'
import { fmt12, nowMin, weekStartOf } from '../lib/time'
import { BottomSheet, Card, Time12, cx } from './ui'

const STATE_UI: Record<MealState, { label: string; cls: string; bar: string }> = {
  on: { label: 'On plan', cls: 'bg-ceiling/10 text-ceiling-ink', bar: 'bg-ceiling' },
  treat: { label: 'Treat', cls: 'bg-floor/15 text-floor-ink', bar: 'bg-floor' },
  over: { label: 'Over allowance', cls: 'bg-miss/10 text-miss-ink', bar: 'bg-miss' },
  off: { label: 'Off plan', cls: 'bg-miss/10 text-miss-ink', bar: 'bg-miss' },
  skipped: { label: 'Skipped', cls: 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-300', bar: 'bg-miss/60' },
  open: { label: '', cls: '', bar: 'bg-slate-200 dark:bg-night-line' },
}

/** Rough diet check: what you ate per planned meal, plus water. No calories by design. */
export function DietCard({ date, now, live }: { date: string; now: Date; live: boolean }) {
  const { data, logMeal, setWater } = useStore()
  const [open, setOpen] = useState<MealSlot | null>(null)
  const plan = data.mealPlan
  const day = data.days[date]
  const sum = daySummary(data, date)
  const allowed = allowedEatOuts(data, date)
  const eatOuts = eatOutsInWeek(data, weekStartOf(date)).length
  const focus = live ? currentSlotId(plan, day?.meals, nowMin(now)) : undefined
  const ateOutEarlier = (slot: MealSlot) =>
    plan.slots.some((s) => s.time < slot.time && ['treat', 'over'].includes(mealState(data, date, s, allowed)))
  const liters = (g: number) => `${Math.round(g * 0.25 * 100) / 100} L`

  const quickDone = (slot: MealSlot) => {
    if (slot.options.length === 1 && !slot.addOns?.length) logMeal(date, slot.id, { status: 'done', optionId: slot.options[0].id })
    else setOpen(slot)
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#A16207]/10 text-[#A16207] dark:text-amber-400">
            <Salad size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-brand dark:text-white">Diet</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Your meal plan • Tap what you ate</p>
          </div>
        </div>
        <p className="text-right">
          <span className="text-2xl font-bold tabular-nums text-brand dark:text-white">
            {sum.onPlan}/{sum.total}
          </span>
          <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">on plan</span>
        </p>
      </div>

      {/* One segment per meal, coloured by how it went */}
      <div className="mb-3 flex gap-1" aria-hidden>
        {plan.slots.map((s) => (
          <span key={s.id} className={cx('h-2 flex-1 rounded-full', STATE_UI[mealState(data, date, s, allowed)].bar)} />
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 text-xs font-semibold">
        <span
          className={cx(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
            sum.eatRight ? 'bg-ceiling/10 text-ceiling-ink' : 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-300',
          )}
        >
          {sum.eatRight ? <Check size={13} strokeWidth={3} /> : null}
          Eat Right {sum.eatRight ? '• auto' : sum.eatRight === false ? '• not yet' : '• log meals'}
        </span>
        <span
          className={cx(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
            eatOuts > plan.eatOutPerWeek ? 'bg-miss/10 text-miss-ink' : 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-300',
          )}
        >
          <Utensils size={12} /> Eating out {Math.min(eatOuts, plan.eatOutPerWeek)}/{plan.eatOutPerWeek} this week
          {eatOuts > plan.eatOutPerWeek && ` • +${eatOuts - plan.eatOutPerWeek} over`}
        </span>
      </div>

      <ol aria-label="Meals" className="flex flex-col gap-1.5">
        {plan.slots.map((slot) => {
          const log = day?.meals?.[slot.id]
          const state = mealState(data, date, slot, allowed)
          const opt = optionOf(slot, log)
          const ui = STATE_UI[state]
          const isFocus = slot.id === focus
          const suggestLight = state === 'open' && ateOutEarlier(slot) && slot.options.some((o) => o.afterEatingOut)
          const addOnText = slot.addOns?.filter((a) => log?.addOns?.includes(a.id)).map((a) => a.label)
          return (
            <li key={slot.id}>
              <div
                className={cx(
                  'flex min-h-14 items-center gap-2 rounded-2xl border px-3 py-2 transition-colors',
                  isFocus ? 'border-brand ring-4 ring-brand/10 dark:border-accent dark:ring-accent/15' : 'border-slate-200/80 dark:border-night-line',
                  state === 'open' ? 'bg-white dark:bg-night-card' : 'bg-slate-50/60 dark:bg-night',
                )}
              >
                <button onClick={() => setOpen(slot)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${slot.title}${opt ? ` • ${opt.label}` : ''}${ui.label ? ` • ${ui.label}` : ''}`}>
                  <Time12 hhmm={slot.time} className="w-[62px] shrink-0 font-mono text-[13px] font-semibold text-brand dark:text-white" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={cx('truncate text-sm font-semibold', state === 'skipped' ? 'text-slate-500 line-through dark:text-slate-400' : 'text-brand dark:text-white')}>{slot.title}</span>
                      {isFocus && <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-accent dark:bg-accent dark:text-brand">NOW</span>}
                    </span>
                    <span className="block truncate text-xs text-slate-600 dark:text-slate-400">
                      {opt ? [opt.label, ...(addOnText ?? [])].join(' • ') : suggestLight ? 'Ate out earlier • Light dinner suggested' : slot.details}
                    </span>
                  </span>
                </button>
                {state === 'open' ? (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => quickDone(slot)}
                      aria-label={slot.options.length === 1 && !slot.addOns?.length ? `${slot.title} done` : `Choose ${slot.title}`}
                      className="flex size-11 items-center justify-center rounded-xl border-2 border-ceiling/40 text-ceiling-ink hover:border-ceiling hover:bg-ceiling/10"
                    >
                      {slot.options.length === 1 && !slot.addOns?.length ? <Check size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={2.6} />}
                    </button>
                    <button
                      onClick={() => logMeal(date, slot.id, { status: 'skipped' })}
                      aria-label={`${slot.title} skipped`}
                      className="flex size-11 items-center justify-center rounded-xl border-2 border-miss/30 text-miss-ink/80 hover:border-miss hover:bg-miss/10"
                    >
                      <X size={18} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <span className={cx('shrink-0 rounded-full px-2 py-1 text-[11px] font-bold', ui.cls)}>{ui.label}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sky-50 px-3 py-2 dark:bg-sky-500/10">
        <Droplets size={18} className="shrink-0 text-sky-700 dark:text-sky-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand dark:text-white">
            Water <span className="tabular-nums">{sum.water}/{sum.waterTarget}</span> glasses
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {liters(sum.water)} of {liters(sum.waterTarget)}
            {sum.water < sum.waterTarget ? ` • ${sum.waterTarget - sum.water} to go` : ' • Target hit 🎉'}
          </p>
        </div>
        <button
          onClick={() => setWater(date, sum.water - 1)}
          disabled={sum.water <= 0}
          aria-label="One less glass"
          className="flex size-11 items-center justify-center rounded-xl bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => setWater(date, sum.water + 1)}
          aria-label="Add a glass of water"
          className="flex size-11 items-center justify-center rounded-xl bg-brand text-white shadow-sm dark:bg-accent dark:text-brand"
        >
          <Plus size={16} />
        </button>
      </div>

      {open && <MealSheet key={open.id} date={date} slot={open} suggestLight={ateOutEarlier(open)} eatOutsUsed={eatOuts} onClose={() => setOpen(null)} />}
    </Card>
  )
}

function MealSheet({
  date,
  slot,
  suggestLight,
  eatOutsUsed,
  onClose,
}: {
  date: string
  slot: MealSlot
  suggestLight: boolean
  eatOutsUsed: number
  onClose: () => void
}) {
  const { data, logMeal } = useStore()
  const current = data.days[date]?.meals?.[slot.id]
  // Smart default: add-ons (e.g. nuts) start ticked
  const [addOns, setAddOns] = useState<string[]>(current?.addOns ?? slot.addOns?.map((a) => a.id) ?? [])
  const [picked, setPicked] = useState<string | undefined>(current?.optionId)
  const allowance = data.mealPlan.eatOutPerWeek
  const save = (log: MealLog | undefined) => {
    logMeal(date, slot.id, log)
    onClose()
  }
  const choose = (id: string) => {
    if (slot.addOns?.length) setPicked(id)
    else save({ status: 'done', optionId: id })
  }

  return (
    <BottomSheet open onClose={onClose} title={slot.title} sub={`${fmt12(slot.time)} • What did you have?`}>
      <div role="radiogroup" aria-label={`${slot.title} options`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {slot.options.map((o) => {
          const on = (picked ?? current?.optionId) === o.id && current?.status !== 'skipped'
          const tag = o.offPlan
            ? { t: 'Off plan', c: 'bg-miss/10 text-miss-ink' }
            : o.eatingOut
              ? { t: `Eating out • ${Math.min(eatOutsUsed, allowance)}/${allowance} used`, c: 'bg-floor/15 text-floor-ink' }
              : o.afterEatingOut && suggestLight
                ? { t: 'Suggested', c: 'bg-ceiling/10 text-ceiling-ink' }
                : null
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={on}
              onClick={() => choose(o.id)}
              className={cx(
                'flex min-h-14 flex-col items-start justify-center rounded-2xl border-2 px-3 py-2 text-left transition-colors',
                on ? 'border-brand bg-brand/5 dark:border-accent dark:bg-accent/10' : 'border-slate-200 bg-white hover:border-slate-400 dark:border-night-line dark:bg-night-card',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold text-brand dark:text-white">{o.label}</span>
                {on && <Check size={16} strokeWidth={3} className="shrink-0 text-ceiling-ink" />}
              </span>
              {o.details && <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{o.details}</span>}
              {tag && <span className={cx('mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold', tag.c)}>{tag.t}</span>}
            </button>
          )
        })}
      </div>

      {slot.addOns?.length ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Also had</p>
          <div className="flex flex-wrap gap-1.5">
            {slot.addOns.map((a) => {
              const on = addOns.includes(a.id)
              return (
                <button
                  key={a.id}
                  aria-pressed={on}
                  onClick={() => setAddOns((l) => (on ? l.filter((x) => x !== a.id) : [...l, a.id]))}
                  className={cx(
                    'inline-flex h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold',
                    on ? 'border-ceiling-solid bg-ceiling-solid text-white' : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300',
                  )}
                >
                  {on && <Check size={14} strokeWidth={3} />} {a.label}
                </button>
              )
            })}
          </div>
          <button
            disabled={!picked}
            onClick={() => save({ status: 'done', optionId: picked, addOns })}
            className="mt-4 h-12 w-full rounded-2xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand"
          >
            {picked ? 'Save' : 'Pick what you had'}
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4 dark:border-night-line">
        <button
          onClick={() => save({ status: 'skipped' })}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-miss/30 text-sm font-semibold text-miss-ink hover:bg-miss/10"
        >
          <X size={15} strokeWidth={3} /> Skipped it
        </button>
        {current && (
          <button onClick={() => save(undefined)} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 dark:border-night-line dark:text-slate-300">
            Clear
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

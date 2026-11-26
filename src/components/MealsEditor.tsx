import { useState } from 'react'
import { Minus, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import type { MealOption, MealPlan, MealSlot } from '../types'
import { useStore } from '../store/AppStore'
import { toMin } from '../lib/time'
import { Card, cx } from './ui'
import { defaultMealPlan } from '../data/defaults'

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const input =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white dark:focus:border-accent'

function Stepper({ label, sub, value, min, max, onChange }: { label: string; sub: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-brand dark:text-white">{label}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">{sub}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-night">
        <button aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex size-11 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white">
          <Minus size={15} />
        </button>
        <span className="w-8 text-center text-lg font-bold tabular-nums text-brand dark:text-white">{value}</span>
        <button aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-11 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white">
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}

/** Edit the meal plan. Changes apply from now on; past days keep what you logged. */
export function MealsEditor() {
  const { data, setMealPlan, resetMealPlan, notify } = useStore()
  const [draft, setDraft] = useState<MealPlan>(() => structuredClone(data.mealPlan))
  const [armed, setArmed] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.mealPlan)
  const setSlot = (id: string, patch: Partial<MealSlot>) => setDraft((p) => ({ ...p, slots: p.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const setOption = (slot: MealSlot, oid: string, patch: Partial<MealOption>) => setSlot(slot.id, { options: slot.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) })
  const valid = draft.slots.every((s) => s.title.trim() && s.options.length > 0 && s.options.every((o) => o.label.trim()))

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-4">
        <Stepper label="Water target" sub={`${draft.waterGlasses} glasses × 250 ml = ${draft.waterGlasses * 0.25} L`} value={draft.waterGlasses} min={4} max={20} onChange={(n) => setDraft({ ...draft, waterGlasses: n })} />
        <Stepper label="Eating out allowance" sub="Meals out or cheat meals per week" value={draft.eatOutPerWeek} min={0} max={7} onChange={(n) => setDraft({ ...draft, eatOutPerWeek: n })} />
      </Card>

      {[...draft.slots]
        .sort((a, b) => toMin(a.time) - toMin(b.time))
        .map((slot) => (
          <Card key={slot.id} className="flex flex-col gap-3">
            <div className="grid grid-cols-[120px_1fr_auto] items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Time</span>
                <input type="time" aria-label={`${slot.title} time`} value={slot.time} onChange={(e) => e.target.value && setSlot(slot.id, { time: e.target.value })} className={input} />
              </label>
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Meal</span>
                <input aria-label="Meal name" value={slot.title} maxLength={28} onChange={(e) => setSlot(slot.id, { title: e.target.value })} className={input} />
              </label>
              <button
                aria-label={`Delete ${slot.title}`}
                onClick={() => setDraft((p) => ({ ...p, slots: p.slots.filter((s) => s.id !== slot.id) }))}
                className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-miss/10 hover:text-miss-ink"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <label className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-night-line">
              <span className="text-sm text-brand dark:text-white">Main meal • must be on plan for Eat Right</span>
              <input type="checkbox" checked={!!slot.main} onChange={(e) => setSlot(slot.id, { main: e.target.checked || undefined })} className="size-5 accent-[#0A2540]" />
            </label>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Options</p>
              <ul className="flex flex-col gap-1.5">
                {slot.options.map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    <input aria-label="Option" value={o.label} maxLength={40} onChange={(e) => setOption(slot, o.id, { label: e.target.value })} className={cx(input, 'flex-1')} />
                    {(o.offPlan || o.eatingOut || o.afterEatingOut) && (
                      <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 sm:inline dark:bg-night dark:text-slate-300">
                        {o.offPlan ? 'Off plan' : o.eatingOut ? 'Eating out' : 'After eating out'}
                      </span>
                    )}
                    <button
                      aria-label={`Remove ${o.label}`}
                      disabled={slot.options.length <= 1}
                      onClick={() => setSlot(slot.id, { options: slot.options.filter((x) => x.id !== o.id) })}
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-miss/10 hover:text-miss-ink disabled:opacity-30"
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSlot(slot.id, { options: [...slot.options, { id: uid('opt'), label: '' }] })}
                className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-slate-100 dark:text-accent dark:hover:bg-night"
              >
                <Plus size={15} /> Add option
              </button>
            </div>
          </Card>
        ))}

      <button
        onClick={() => setDraft((p) => ({ ...p, slots: [...p.slots, { id: uid('meal'), time: '16:00', title: 'Snack', options: [{ id: uid('opt'), label: 'As planned' }] }] }))}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand dark:border-night-line dark:text-slate-300"
      >
        <Plus size={18} /> Add meal
      </button>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 md:bottom-4">
        <button
          onClick={() => {
            if (!armed) {
              setArmed(true)
              window.setTimeout(() => setArmed(false), 2500)
              return
            }
            resetMealPlan()
            setDraft(defaultMealPlan())
            setArmed(false)
            notify('Meal plan reset to your chart')
          }}
          className={cx(
            'inline-flex h-12 items-center gap-1.5 rounded-2xl border-2 bg-white px-4 text-sm font-semibold dark:bg-night-card',
            armed ? 'border-miss text-miss-ink' : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300',
          )}
        >
          <RotateCcw size={14} /> {armed ? 'Tap to confirm' : 'Reset to my chart'}
        </button>
        <button
          disabled={!dirty || !valid}
          onClick={() => {
            setMealPlan(draft)
            notify('Meal plan saved')
          }}
          className="h-12 flex-1 rounded-2xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 disabled:opacity-40 dark:bg-accent dark:text-brand"
        >
          {!valid ? 'Name every meal & option' : dirty ? 'Save meal plan' : 'Saved'}
        </button>
      </div>
    </div>
  )
}

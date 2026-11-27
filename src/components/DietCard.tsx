import { useMemo, useState } from 'react'
import { Check, ChevronRight, Droplets, Minus, Plus, Salad, Sparkles, Utensils, X } from 'lucide-react'
import type { LoggedFood, MealLog, MealSlot } from '../types'
import { useStore } from '../store/AppStore'
import { allowedEatOuts, currentSlotId, daySummary, eatOutsInWeek, mealState, optionsOf, type MealState } from '../lib/diet'
import { DEFAULT_TARGETS, addN, dayN, defaultServings, foodN, mealItems, mealN, optionItems, rangeStatus, round, ZERO, type Nutrients } from '../lib/nutrition'
import { parseFoods, type ParsedItem } from '../lib/foodParse'
import { FOOD_BY_ID, UNIT_CHOICES, qtyLabel, type Food } from '../data/foods'
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

const frac = (n: number) => (n === 0.5 ? '½' : n === 1.5 ? '1½' : n === 0.25 ? '¼' : String(n))
const est = (n: Nutrients) => `≈ ${round(n.kcal)} kcal · ${round(n.protein)} g protein`

/** One-line summary of what was logged for a meal, e.g. "3 eggs • ½ katori poha". */
function mealSummary(slot: MealSlot, log?: MealLog) {
  if (!log || log.status !== 'done') return ''
  const parts: string[] = []
  for (const o of optionsOf(slot, log)) {
    const s = log.servings?.[o.id]
    if (o.adjust && s !== undefined) parts.push(qtyLabel(FOOD_BY_ID[o.adjust], s))
    else parts.push(s && s !== 1 ? `${frac(s)}× ${o.label}` : o.label)
  }
  for (const a of slot.addOns ?? []) if (log.addOns?.includes(a.id)) parts.push(a.label)
  for (const e of log.extras ?? []) {
    const f = e.food ? FOOD_BY_ID[e.food] : undefined
    if (!f) { parts.push(e.name); continue }
    const q = qtyLabel(f, e.qty)
    const name = f.name.toLowerCase()
    parts.push(q.toLowerCase().includes(name.split(' ')[0]) ? q : `${q} ${name}`)
  }
  return parts.join(' • ')
}

const METERS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: '' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
]

function Meter({ label, value, range, unit }: { label: string; value: number; range: [number, number]; unit: string }) {
  const v = round(value)
  const st = rangeStatus(v, range)
  const max = range[1] * 1.25
  const pct = Math.min(100, (value / max) * 100)
  const lo = (range[0] / max) * 100
  const hi = (range[1] / max) * 100
  const note = st === 'low' ? `${(range[0] - v).toLocaleString()}${unit} to go` : st === 'ok' ? 'On target' : `${(v - range[1]).toLocaleString()}${unit} over`
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-night">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</span>
        <span className={cx('text-[10px] font-bold', st === 'ok' ? 'text-ceiling-ink' : st === 'high' ? 'text-miss-ink' : 'text-floor-ink')}>{note}</span>
      </div>
      <p className="mt-0.5 whitespace-nowrap text-xl font-bold tabular-nums text-brand dark:text-white">
        {v.toLocaleString()}
        {unit && <span className="text-sm font-semibold">{unit}</span>}
      </p>
      <p className="whitespace-nowrap text-[11px] font-medium tabular-nums text-slate-600 dark:text-slate-400">
        Target {range[0].toLocaleString()}–{range[1].toLocaleString()}{unit || ' kcal'}
      </p>
      <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-night-line">
        <span className="absolute inset-y-0 bg-ceiling/25" style={{ left: `${lo}%`, width: `${hi - lo}%` }} aria-hidden />
        <span className={cx('absolute inset-y-0 left-0 rounded-full', st === 'ok' ? 'bg-ceiling' : st === 'high' ? 'bg-miss' : 'bg-floor')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Diet: plan adherence + estimated nutrition from easy portions (nothing to weigh or count). */
export function DietCard({ date, now, live }: { date: string; now: Date; live: boolean }) {
  const { data, logMeal, setWater } = useStore()
  const [open, setOpen] = useState<MealSlot | null>(null)
  const plan = data.mealPlan
  const day = data.days[date]
  const sum = daySummary(data, date)
  const allowed = allowedEatOuts(data, date)
  const eatOuts = eatOutsInWeek(data, weekStartOf(date)).length
  const focus = live ? currentSlotId(plan, day?.meals, nowMin(now)) : undefined
  const total = dayN(data, date)
  const targets = plan.targets ?? DEFAULT_TARGETS
  const ateOutEarlier = (slot: MealSlot) => plan.slots.some((s) => s.time < slot.time && ['treat', 'over'].includes(mealState(data, date, s, allowed)))
  const liters = (g: number) => `${Math.round(g * 0.25 * 100) / 100} L`

  const quickDone = (slot: MealSlot) => {
    if (slot.options.length === 1 && !slot.addOns?.length) logMeal(date, slot.id, { status: 'done', optionIds: [slot.options[0].id] })
    else setOpen(slot)
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#A16207]/10 text-[#A16207] dark:text-amber-400">
            <Salad size={20} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-brand dark:text-white">Diet</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Tap what you ate • Live estimates</p>
          </div>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-2xl font-bold tabular-nums text-brand dark:text-white">
            {sum.onPlan}/{sum.total}
          </span>
          <span className="block whitespace-nowrap text-[11px] font-semibold text-slate-600 dark:text-slate-400">on plan</span>
        </p>
      </div>

      <div className="mb-3 flex gap-1" aria-hidden>
        {plan.slots.map((s) => (
          <span key={s.id} className={cx('h-2 flex-1 rounded-full', STATE_UI[mealState(data, date, s, allowed)].bar)} />
        ))}
      </div>

      {/* Estimated nutrition vs your chart */}
      <section aria-label="Today's estimate" className="mb-3">
        <div className="grid grid-cols-2 gap-2">
          {METERS.map((m) => (
            <Meter key={m.key} label={m.label} unit={m.unit} value={total[m.key]} range={targets[m.key]} />
          ))}
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <Sparkles size={11} /> Rough estimates from portions • No weighing needed
        </p>
      </section>

      <div className="mb-3 flex flex-wrap gap-1.5 text-xs font-semibold">
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1', sum.eatRight ? 'bg-ceiling/10 text-ceiling-ink' : 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-300')}>
          {sum.eatRight ? <Check size={13} strokeWidth={3} /> : null}
          Eat Right {sum.eatRight ? '• auto' : sum.eatRight === false ? '• not yet' : '• log meals'}
        </span>
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1', eatOuts > plan.eatOutPerWeek ? 'bg-miss/10 text-miss-ink' : 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-300')}>
          <Utensils size={12} /> Eating out {Math.min(eatOuts, plan.eatOutPerWeek)}/{plan.eatOutPerWeek} this week
          {eatOuts > plan.eatOutPerWeek && ` • +${eatOuts - plan.eatOutPerWeek} over`}
        </span>
      </div>

      <ol aria-label="Meals" className="flex flex-col gap-1.5">
        {plan.slots.map((slot) => {
          const log = day?.meals?.[slot.id]
          const state = mealState(data, date, slot, allowed)
          const ui = STATE_UI[state]
          const isFocus = slot.id === focus
          const summary = mealSummary(slot, log)
          const n = mealN(slot, log)
          const suggestLight = state === 'open' && ateOutEarlier(slot) && slot.options.some((o) => o.afterEatingOut)
          return (
            <li key={slot.id}>
              <div
                className={cx(
                  'flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2 transition-colors',
                  isFocus ? 'border-brand ring-4 ring-brand/10 dark:border-accent dark:ring-accent/15' : 'border-slate-200/80 dark:border-night-line',
                  state === 'open' ? 'bg-white dark:bg-night-card' : 'bg-slate-50/60 dark:bg-night',
                )}
              >
                <button onClick={() => setOpen(slot)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${slot.title}${summary ? ` • ${summary}` : ''}${ui.label ? ` • ${ui.label}` : ''}`}>
                  <Time12 hhmm={slot.time} className="w-[60px] shrink-0 font-mono text-[13px] font-semibold text-brand dark:text-white" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={cx('truncate text-sm font-semibold', state === 'skipped' ? 'text-slate-500 line-through dark:text-slate-400' : 'text-brand dark:text-white')}>{slot.title}</span>
                      {isFocus && <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-accent dark:bg-accent dark:text-brand">NOW</span>}
                    </span>
                    <span className="block truncate text-xs text-slate-600 dark:text-slate-400">
                      {summary || (suggestLight ? 'Ate out earlier • Light dinner suggested' : slot.details)}
                    </span>
                    {n.kcal > 0 && <span className="block text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">{est(n)}</span>}
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
        <button onClick={() => setWater(date, sum.water - 1)} disabled={sum.water <= 0} aria-label="One less glass" className="flex size-11 items-center justify-center rounded-xl bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white">
          <Minus size={16} />
        </button>
        <button onClick={() => setWater(date, sum.water + 1)} aria-label="Add a glass of water" className="flex size-11 items-center justify-center rounded-xl bg-brand text-white shadow-sm dark:bg-accent dark:text-brand">
          <Plus size={16} />
        </button>
      </div>

      {open && <MealSheet key={open.id} date={date} slot={open} suggestLight={ateOutEarlier(open)} eatOutsUsed={eatOuts} onClose={() => setOpen(null)} />}
    </Card>
  )
}

/* ---------- Meal sheet: multi-select plan options + your own words ---------- */

function QtyChips({ food, qty, onChange, label }: { food: Food; qty: number; onChange: (q: number) => void; label: string }) {
  const choices = UNIT_CHOICES[food.unit]
  const custom = !choices.includes(qty)
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
      {custom && (
        <button role="radio" aria-checked className="h-11 shrink-0 rounded-full border-2 border-brand bg-brand px-3 text-xs font-bold text-white dark:border-accent dark:bg-accent dark:text-brand">
          {qtyLabel(food, qty)}
        </button>
      )}
      {choices.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={qty === c}
          onClick={() => onChange(c)}
          className={cx(
            'h-11 shrink-0 rounded-full border-2 px-3 text-xs font-bold transition-colors',
            qty === c ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-night-line dark:bg-night-card dark:text-slate-300',
          )}
        >
          {qtyLabel(food, c)}
        </button>
      ))}
    </div>
  )
}

function Stepper({ value, min, max, onChange, label, text }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string; text: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-night" role="group" aria-label={label}>
      <button aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex size-11 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white">
        <Minus size={16} />
      </button>
      <span className="min-w-[72px] text-center text-sm font-bold tabular-nums text-brand dark:text-white">{text}</span>
      <button aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-11 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white">
        <Plus size={16} />
      </button>
    </div>
  )
}

const SERVINGS = [0.5, 1, 1.5, 2]

function MealSheet({ date, slot, suggestLight, eatOutsUsed, onClose }: { date: string; slot: MealSlot; suggestLight: boolean; eatOutsUsed: number; onClose: () => void }) {
  const { data, logMeal } = useStore()
  const current = data.days[date]?.meals?.[slot.id]
  const done = current?.status === 'done' ? current : undefined
  const [picked, setPicked] = useState<string[]>(() => (done ? optionsOf(slot, done).map((o) => o.id) : []))
  const [servings, setServings] = useState<Record<string, number>>(() => ({ ...(done?.servings ?? {}) }))
  // Smart default: add-ons (e.g. nuts) start ticked for a fresh log
  const [addOns, setAddOns] = useState<string[]>(() => done?.addOns ?? (current ? [] : (slot.addOns?.map((a) => a.id) ?? [])))
  const [extras, setExtras] = useState<LoggedFood[]>(() => done?.extras ?? [])
  const [text, setText] = useState('')
  const [unsure, setUnsure] = useState<ParsedItem[]>([])
  const allowance = data.mealPlan.eatOutPerWeek

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const addText = () => {
    const parsed = parseFoods(text)
    setExtras((e) => [...e, ...parsed.filter((p) => p.food).map((p) => ({ food: p.food!.id, name: p.food!.name, qty: p.qty }))])
    setUnsure((u) => [...u, ...parsed.filter((p) => !p.food)])
    setText('')
  }
  const preview = useMemo(() => (text.trim() ? parseFoods(text) : []), [text])

  const draft: MealLog = { status: 'done', optionIds: picked, servings, addOns, extras }
  const total = useMemo(() => mealItems(slot, draft).reduce((acc, i) => addN(acc, foodN(i.food, i.qty)), ZERO), [slot, picked, servings, addOns, extras]) // eslint-disable-line
  const canSave = picked.length > 0 || extras.length > 0 || unsure.length > 0

  const save = (log: MealLog | undefined) => {
    logMeal(date, slot.id, log)
    onClose()
  }
  const saveDraft = () => {
    const notes = unsure.map((u) => ({ name: u.raw, qty: 1 }))
    const cleanServ = Object.fromEntries(Object.entries(servings).filter(([k]) => picked.includes(k)))
    save({ status: 'done', optionIds: picked, ...(Object.keys(cleanServ).length ? { servings: cleanServ } : {}), ...(slot.addOns?.length ? { addOns } : {}), ...(extras.length || notes.length ? { extras: [...extras, ...notes] } : {}) })
  }

  return (
    <BottomSheet open onClose={onClose} title={slot.title} sub={`${fmt12(slot.time)} • Pick everything you had`} wide>
      <div className="flex flex-col gap-5 pb-2">
        {/* Plan options — select as many as apply */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">From your plan</p>
          <div role="group" aria-label={`${slot.title} options`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {slot.options.map((o) => {
              const on = picked.includes(o.id)
              const s = servings[o.id] ?? defaultServings(o)
              const n = optionItems(o, servings[o.id]).reduce((acc, i) => addN(acc, foodN(i.food, i.qty)), ZERO)
              const tag = o.offPlan
                ? { t: 'Off plan • describe below', c: 'bg-miss/10 text-miss-ink' }
                : o.eatingOut
                  ? { t: `Eating out • ${Math.min(eatOutsUsed, allowance)}/${allowance} used`, c: 'bg-floor/15 text-floor-ink' }
                  : o.afterEatingOut && suggestLight
                    ? { t: 'Suggested', c: 'bg-ceiling/10 text-ceiling-ink' }
                    : null
              const adjustFood = o.adjust ? FOOD_BY_ID[o.adjust] : undefined
              return (
                <div key={o.id} className={cx('rounded-2xl border-2 transition-colors', on ? 'border-brand bg-brand/5 dark:border-accent dark:bg-accent/10' : 'border-slate-200 bg-white dark:border-night-line dark:bg-night-card')}>
                  <button role="checkbox" aria-checked={on} aria-label={o.label} onClick={() => toggle(o.id)} className="flex min-h-14 w-full items-start gap-3 px-3 py-2.5 text-left">
                    <span className={cx('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2', on ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand' : 'border-slate-300 dark:border-night-line')}>
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-brand dark:text-white">{adjustFood && on ? `${o.label} • ${qtyLabel(adjustFood, s)}` : o.label}</span>
                      {o.details && <span className="block text-xs leading-relaxed text-slate-600 dark:text-slate-400">{o.details}</span>}
                      {n.kcal > 0 && <span className="block text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{est(n)}</span>}
                      {tag && <span className={cx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold', tag.c)}>{tag.t}</span>}
                    </span>
                  </button>
                  {on && (o.items?.length ?? 0) > 0 && (
                    <div className="border-t border-slate-200/70 px-3 py-2 dark:border-night-line">
                      {adjustFood ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">How many?</span>
                          <Stepper label={`${adjustFood.unitLabel ?? adjustFood.unit}s`} value={s} min={1} max={12} onChange={(v) => setServings((x) => ({ ...x, [o.id]: v }))} text={qtyLabel(adjustFood, s)} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Portion</span>
                          <div role="radiogroup" aria-label={`${o.label} portion`} className="flex gap-1">
                            {SERVINGS.map((v) => (
                              <button
                                key={v}
                                role="radio"
                                aria-checked={s === v}
                                onClick={() => setServings((x) => ({ ...x, [o.id]: v }))}
                                className={cx('h-11 min-w-11 rounded-full border-2 px-2 text-xs font-bold', s === v ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand' : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300')}
                              >
                                {frac(v)}×
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {slot.addOns?.length ? (
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Also had</p>
            <div className="flex flex-wrap gap-1.5">
              {slot.addOns.map((a) => {
                const on = addOns.includes(a.id)
                return (
                  <button key={a.id} aria-pressed={on} onClick={() => setAddOns((l) => (on ? l.filter((x) => x !== a.id) : [...l, a.id]))} className={cx('inline-flex h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold', on ? 'border-ceiling-solid bg-ceiling-solid text-white' : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300')}>
                    {on && <Check size={14} strokeWidth={3} />} {a.label}
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Your own words */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Anything else? Type it</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim()) addText()
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="What else did you have"
              placeholder="e.g. 2 boiled eggs, ½ katori poha, chai"
              className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-[15px] text-brand outline-none placeholder:text-slate-400 focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white dark:focus:border-accent"
            />
            <button disabled={!text.trim()} className="h-12 shrink-0 rounded-2xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand">
              Add
            </button>
          </form>
          {preview.length > 0 && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              Detected: {preview.map((p) => (p.food ? `${qtyLabel(p.food, p.qty)} ${p.food.name.toLowerCase()}` : `"${p.raw}"?`)).join(' • ')}
            </p>
          )}

          {extras.length > 0 && (
            <ul aria-label="Added foods" className="mt-3 flex flex-col gap-2">
              {extras.map((e, i) => {
                const food = e.food ? FOOD_BY_ID[e.food] : undefined
                return (
                  <li key={i} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-night-line dark:bg-night-card">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-brand dark:text-white">{food?.name ?? e.name}</span>
                        {food && <span className="block text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{est(foodN(food.id, e.qty))}</span>}
                      </span>
                      <button aria-label={`Remove ${food?.name ?? e.name}`} onClick={() => setExtras((x) => x.filter((_, j) => j !== i))} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-miss/10 hover:text-miss-ink">
                        <X size={16} />
                      </button>
                    </div>
                    {food && <QtyChips food={food} qty={e.qty} label={`${food.name} quantity`} onChange={(q) => setExtras((x) => x.map((y, j) => (j === i ? { ...y, qty: q } : y)))} />}
                  </li>
                )
              })}
            </ul>
          )}

          {unsure.map((u, i) => (
            <div key={`${u.raw}-${i}`} className="mt-2 rounded-2xl border-2 border-dashed border-floor/50 bg-floor/5 p-3">
              <p className="text-sm font-semibold text-brand dark:text-white">Not sure what “{u.raw}” is</p>
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">{u.suggestions.length ? 'Did you mean…' : 'Saved as a note • not counted in estimates'}</p>
              <div className="flex flex-wrap gap-1.5">
                {u.suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setExtras((x) => [...x, { food: s.id, name: s.name, qty: u.qtyGiven ? u.qty : s.defaultQty }])
                      setUnsure((l) => l.filter((_, j) => j !== i))
                    }}
                    className="h-11 rounded-full border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-brand hover:border-brand dark:border-night-line dark:bg-night-card dark:text-white"
                  >
                    {s.name}
                  </button>
                ))}
                <button onClick={() => setUnsure((l) => l.filter((_, j) => j !== i))} className="h-11 rounded-full px-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Sticky footer: running estimate + primary action in the thumb zone */}
        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-paper/95 px-4 pb-2 pt-3 backdrop-blur dark:border-night-line dark:bg-night/95">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">This meal</span>
            <span className="text-sm font-bold tabular-nums text-brand dark:text-white">{total.kcal > 0 ? est(total) : '—'}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => save({ status: 'skipped' })} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl border-2 border-miss/30 px-4 text-sm font-semibold text-miss-ink hover:bg-miss/10">
              <X size={15} strokeWidth={3} /> Skipped
            </button>
            {current && (
              <button onClick={() => save(undefined)} className="h-12 rounded-2xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-600 dark:border-night-line dark:text-slate-300">
                Clear
              </button>
            )}
            <button disabled={!canSave} onClick={saveDraft} className="h-12 flex-1 rounded-2xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 disabled:opacity-40 dark:bg-accent dark:text-brand">
              {canSave ? 'Save' : 'Pick or type what you had'}
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

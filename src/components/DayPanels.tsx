import { useState } from 'react'
import { ArrowRight, Crosshair, Moon, Sparkles } from 'lucide-react'
import type { Block, DayLog, FacetId, Reflection } from '../types'
import { HOUR_FACETS, blockMinutes, facetOfCategory, fmtH } from '../lib/facets'
import { effectiveStatus } from '../lib/stats'
import { nowMin, toMin } from '../lib/time'
import { useStore } from '../store/AppStore'
import { BottomSheet, Card, Kbd, Label, cx } from './ui'

const fmtDur = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

/** Live "what now / what next" focal card (today only). */
export function NowNext({ blocks, now, focus }: { blocks: Block[]; now: Date; focus?: string }) {
  const m = nowMin(now)
  const cur = blocks.find((b) => m >= toMin(b.start) && m < toMin(b.end, true))
  const next = blocks.find((b) => toMin(b.start) > m)
  return (
    <section aria-label="Now and next" className="overflow-hidden rounded-2xl bg-brand text-white shadow-lg shadow-brand/20 dark:bg-brand-2">
      {focus && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2 text-xs">
          <Crosshair size={14} className="shrink-0 text-accent" />
          <span className="font-semibold text-white/60">Today's focus</span>
          <span className="truncate font-semibold">{focus}</span>
        </div>
      )}
      <div className="p-4">
        {cur ? (
          <>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wider text-brand">NOW</span>
              <span className="font-mono text-xs text-white/60">
                {cur.start}–{cur.end}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold">{cur.title}</h2>
            <p className="text-sm text-white/60">{cur.details}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${((m - toMin(cur.start)) / (toMin(cur.end, true) - toMin(cur.start))) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-accent">{fmtDur(toMin(cur.end, true) - m)} left</p>
          </>
        ) : next ? (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Between blocks</span>
            <h2 className="mt-1 text-xl font-bold">Day starts soon</h2>
          </>
        ) : (
          <>
            <Moon size={20} className="text-accent" />
            <h2 className="mt-1 text-xl font-bold">Day complete</h2>
            <p className="text-sm text-white/60">Log blocks • Reflect • Rest</p>
          </>
        )}
        {next && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <ArrowRight size={14} className="text-white/50" />
            <span className="text-white/60">Next</span>
            <span className="truncate font-semibold">{next.title}</span>
            <span className="ml-auto shrink-0 text-xs text-accent">in {fmtDur(toMin(next.start) - m)}</span>
          </div>
        )}
      </div>
    </section>
  )
}

/** Hours invested per life facet for one day: done vs planned. */
export function DayFacets({ day, blocks }: { day?: DayLog; blocks: Block[] }) {
  const planned: Partial<Record<FacetId, number>> = {}
  const done: Partial<Record<FacetId, number>> = {}
  for (const b of blocks) {
    const f = facetOfCategory(b.category)
    if (!f) continue
    const mins = blockMinutes(b)
    planned[f] = (planned[f] ?? 0) + mins
    if (day && effectiveStatus(day, b.id) === 'completed') done[f] = (done[f] ?? 0) + mins
  }
  const rows = HOUR_FACETS.filter((f) => planned[f.id])
  const growthDone = rows.filter((f) => f.growth).reduce((a, f) => a + (done[f.id] ?? 0), 0) / 60
  const growthPlan = rows.filter((f) => f.growth).reduce((a, f) => a + (planned[f.id] ?? 0), 0) / 60
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-brand dark:text-white">Time Invested</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Done vs planned • This day</p>
        </div>
        <p className="text-right">
          <span className="text-xl font-bold tabular-nums text-brand dark:text-white">{fmtH(growthDone)}</span>
          <span className="text-xs text-slate-400"> / {fmtH(growthPlan)} growth</span>
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((f) => {
          const p = planned[f.id] ?? 0
          const d = done[f.id] ?? 0
          return (
            <li key={f.id} className="flex items-center gap-3">
              <f.Icon size={15} style={{ color: f.color }} className="shrink-0" />
              <span className="w-24 shrink-0 truncate text-[13px] font-medium text-brand dark:text-white">{f.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
                <div className="h-full rounded-full transition-all" style={{ width: `${(d / p) * 100}%`, background: f.color }} />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {fmtH(d / 60)} / {fmtH(p / 60)}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const ENERGY = ['Drained', 'Low', 'Okay', 'Good', 'Great']

function ReflectField({ label, placeholder, value, onSave }: { label: string; placeholder: string; value?: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value ?? '')
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <input
        value={text}
        maxLength={80}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== (value ?? '') && onSave(text)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-brand outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:bg-white dark:border-night-line dark:bg-night dark:text-white dark:focus:border-accent"
      />
    </label>
  )
}

/** Energy check-in + 3-line reflection. Remount per date (key) to reset local state. */
export function ReflectionCard({ date, day }: { date: string; day?: DayLog }) {
  const { setEnergy, setReflection } = useStore()
  const r: Reflection = day?.reflection ?? {}
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-[15px] font-semibold text-brand dark:text-white">Check-in</h2>
        <span className="text-xs text-slate-400">Energy • Win • Lesson • Focus</span>
      </div>
      <Label>Energy</Label>
      <div className="mb-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Energy">
        {ENERGY.map((label, i) => {
          const v = i + 1
          const active = day?.energy === v
          return (
            <button
              key={v}
              role="radio"
              aria-checked={active}
              onClick={() => setEnergy(date, active ? undefined : v)}
              className={cx(
                'flex min-h-12 flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold transition-colors',
                active
                  ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
                  : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-night-line dark:text-slate-400',
              )}
            >
              <span className="text-base font-bold leading-none">{v}</span>
              <span className="mt-0.5 text-[10px]">{label}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        <ReflectField label="Win" placeholder="One thing that went well" value={r.win} onSave={(v) => setReflection(date, 'win', v)} />
        <ReflectField label="Lesson" placeholder="One thing to adjust" value={r.lesson} onSave={(v) => setReflection(date, 'lesson', v)} />
        <ReflectField label="Tomorrow's focus" placeholder="The one thing that matters" value={r.focus} onSave={(v) => setReflection(date, 'focus', v)} />
      </div>
    </Card>
  )
}

const SHORTCUTS: [string[], string][] = [
  [['C'], 'Ceiling day'],
  [['F'], 'Floor day'],
  [['M'], 'Miss day'],
  [['←', '→'], 'Previous • Next day'],
  [['T'], 'Jump to today'],
  [['1', '2', '3'], 'Today • Dashboard • Goals'],
  [['4', '5', '6'], 'Review • Routine • Settings'],
  [['?'], 'Show shortcuts'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Keyboard shortcuts" sub="Day keys work on the Today page">
      <ul className="flex flex-col divide-y divide-slate-200 dark:divide-night-line">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-brand dark:text-white">{label}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}

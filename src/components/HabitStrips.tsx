import { Check, Sparkles } from 'lucide-react'
import type { Habit } from '../types'
import { useStore } from '../store/AppStore'
import { fmtLong, isWeekend, nowMin, toMin, weekStartOf } from '../lib/time'
import { cx } from './ui'

export function HabitPill({
  label,
  done,
  nudge,
  onToggle,
  sub,
  compact,
}: {
  label: string
  done: boolean
  nudge?: boolean
  onToggle: () => void
  sub?: string
  compact?: boolean
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={done}
      className={cx(
        'relative flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-[13px] font-semibold transition-all active:scale-95',
        compact ? 'min-h-8' : 'min-h-11',
        done
          ? 'border-ceiling bg-ceiling text-white'
          : nudge
            ? 'border-floor bg-floor/10 text-floor'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-brand dark:border-night-line dark:bg-night dark:text-slate-300 dark:hover:border-slate-500',
      )}
    >
      {done ? <Check size={14} strokeWidth={3} className="animate-pop" /> : <span className="size-3.5 rounded-full border-2 border-current opacity-50" />}
      <span className="truncate">{label}</span>
      {sub && !done && <span className="text-[10px] font-medium opacity-70">{sub}</span>}
      {nudge && !done && <span className="absolute -right-1 -top-1 size-2.5 animate-pulse rounded-full bg-floor" aria-hidden />}
    </button>
  )
}

/** Daily essentials grid. `live` enables time-aware nudges (today only). */
export function EssentialsStrip({ date, now, live }: { date: string; now: Date; live: boolean }) {
  const { data, toggleHabit } = useStore()
  const day = data.days[date]
  const habits = data.habits.filter((h) => h.kind === 'daily')
  if (!habits.length) return null
  const m = nowMin(now)
  const nudged = (h: Habit) => live && !!h.nudgeAfter && m >= toMin(h.nudgeAfter)
  const done = habits.filter((h) => day?.habits[h.id]).length
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Daily Essentials</p>
        <span className={cx('text-xs font-bold tabular-nums', done === habits.length ? 'text-ceiling' : 'text-slate-400')}>
          {done}/{habits.length}
        </span>
      </div>
      <div role="group" aria-label="Daily essentials" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {habits.map((h) => (
          <HabitPill key={h.id} label={h.label} done={!!day?.habits[h.id]} nudge={nudged(h)} onToggle={() => toggleHabit(date, h.id)} />
        ))}
      </div>
    </div>
  )
}

/** Weekly care quota (1x/week). Auto-shows on weekends unless `always`. */
export function CareStrip({ date, always = false }: { date: string; always?: boolean }) {
  const { data, toggleCare } = useStore()
  const habits = data.habits.filter((h) => h.kind === 'weekly')
  if (!habits.length || (!always && !isWeekend(date))) return null
  const week = data.weeks[weekStartOf(date)]
  const elsewhere = habits.filter((h) => week?.care[h.id] && week.care[h.id] !== date)
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <Sparkles size={12} /> Weekend Care • 1x/week
      </p>
      <div role="group" aria-label="Weekend care" className="grid grid-cols-2 gap-2">
        {habits.map((h) => {
          const doneOn = week?.care[h.id]
          return <HabitPill key={h.id} label={h.label} done={!!doneOn} sub={doneOn ? undefined : '0/1'} onToggle={() => toggleCare(doneOn ?? date, h.id)} />
        })}
      </div>
      {elsewhere.length > 0 && (
        <p className="mt-1.5 text-[11px] text-slate-400">{elsewhere.map((h) => `${h.label} done ${fmtLong(week!.care[h.id]!)}`).join(' • ')}</p>
      )}
    </div>
  )
}

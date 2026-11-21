import { Check, Sparkles } from 'lucide-react'
import type { Habit } from '../types'
import { useStore } from '../store/AppStore'
import { isWeekend, nowMin, toMin, weekStartOf, fmtLong } from '../lib/time'
import { cx } from './ui'

export function HabitPill({
  label,
  done,
  nudge,
  onToggle,
  sub,
}: {
  label: string
  done: boolean
  nudge?: boolean
  onToggle: () => void
  sub?: string
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={done}
      className={cx(
        'relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border px-2 text-[13px] font-semibold transition-all active:scale-95',
        done
          ? 'border-ceiling bg-ceiling text-white'
          : nudge
            ? 'border-floor bg-floor/10 text-floor ring-2 ring-floor/30'
            : 'border-slate-200 bg-white text-slate-600 dark:border-night-line dark:bg-night-card dark:text-slate-300',
      )}
    >
      {done && <Check size={14} strokeWidth={3} className="animate-pop" />}
      <span className="truncate">{label}</span>
      {sub && !done && <span className="text-[10px] font-medium opacity-70">{sub}</span>}
      {nudge && !done && (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-floor" aria-hidden />
      )}
    </button>
  )
}

/** Daily essentials: one compact row. */
export function EssentialsStrip({ date, now, live }: { date: string; now: Date; live: boolean }) {
  const { data, toggleHabit } = useStore()
  const day = data.days[date]
  const habits = data.habits.filter((h) => h.kind === 'daily')
  if (!habits.length) return null
  const m = nowMin(now)
  const nudged = (h: Habit) => live && !!h.nudgeAfter && m >= toMin(h.nudgeAfter)
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Daily Essentials</p>
      <div className="flex gap-1.5">
        {habits.map((h) => (
          <HabitPill
            key={h.id}
            label={h.label}
            done={!!day?.habits[h.id]}
            nudge={nudged(h)}
            onToggle={() => toggleHabit(date, h.id)}
          />
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
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Sparkles size={12} /> Weekend Care • 1x/week
      </p>
      <div className="flex gap-1.5">
        {habits.map((h) => {
          const doneOn = week?.care[h.id]
          return (
            <HabitPill
              key={h.id}
              label={h.label}
              done={!!doneOn}
              sub={doneOn ? undefined : '0/1'}
              onToggle={() => toggleCare(doneOn ?? date, h.id)}
            />
          )
        })}
      </div>
      {habits.some((h) => week?.care[h.id] && week.care[h.id] !== date) && (
        <p className="mt-1 text-[11px] text-slate-400">
          {habits
            .filter((h) => week?.care[h.id] && week.care[h.id] !== date)
            .map((h) => `${h.label} done ${fmtLong(week!.care[h.id]!)}`)
            .join(' • ')}
        </p>
      )}
    </div>
  )
}

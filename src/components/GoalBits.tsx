import { AlertTriangle, CalendarClock, CheckCircle2, Trophy, XCircle } from 'lucide-react'
import type { Goal } from '../types'
import { FACET_BY_ID } from '../lib/facets'
import { GOAL_KIND_META, type GoalEval, type GoalStatus } from '../lib/goals'
import { cx } from './ui'

export const GOAL_STATUS: Record<GoalStatus, { label: string; cls: string; Icon: typeof Trophy }> = {
  done: { label: 'Done', cls: 'bg-ceiling text-white', Icon: Trophy },
  'on-track': { label: 'On track', cls: 'bg-ceiling/10 text-ceiling', Icon: CheckCircle2 },
  behind: { label: 'Behind', cls: 'bg-floor/10 text-floor', Icon: AlertTriangle },
  'off-track': { label: 'Off track', cls: 'bg-miss/10 text-miss', Icon: XCircle },
  upcoming: { label: 'Upcoming', cls: 'bg-slate-100 text-slate-500 dark:bg-night dark:text-slate-400', Icon: CalendarClock },
  missed: { label: 'Missed', cls: 'bg-miss/10 text-miss', Icon: XCircle },
}

export function GoalStatusPill({ status }: { status: GoalStatus }) {
  const s = GOAL_STATUS[status]
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', s.cls)}>
      <s.Icon size={12} /> {s.label}
    </span>
  )
}

/** Progress bar with a pace marker showing where you "should" be today. */
export function GoalBar({ ev, color }: { ev: GoalEval; color: string }) {
  const pace = Math.min(100, (ev.expected / Math.max(ev.target, 0.0001)) * 100)
  return (
    <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-night">
      <div className="h-full rounded-full transition-all" style={{ width: `${ev.pct}%`, background: color }} />
      {ev.status !== 'done' && ev.status !== 'upcoming' && pace > 0 && pace < 100 && (
        <span
          className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-brand/60 dark:bg-white/60"
          style={{ left: `${pace}%` }}
          title="Where you should be today"
        />
      )}
    </div>
  )
}

/** Compact one-line goal row for Dashboard / Review. */
export function GoalRow({ goal, ev }: { goal: Goal; ev: GoalEval }) {
  const f = FACET_BY_ID[goal.facet]
  const unit = GOAL_KIND_META[goal.kind].unit
  return (
    <li className="flex items-center gap-3">
      <f.Icon size={16} style={{ color: f.color }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-brand dark:text-white">{goal.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {unit(ev.value)} / {unit(ev.target)}
          </span>
        </div>
        <div className="mt-1">
          <GoalBar ev={ev} color={f.color} />
        </div>
      </div>
      <GoalStatusPill status={ev.status} />
    </li>
  )
}

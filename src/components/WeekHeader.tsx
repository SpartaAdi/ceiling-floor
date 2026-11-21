import { TrendingUp } from 'lucide-react'
import { HEALTH_META, type WeekSummary } from '../lib/stats'
import { DOW_LETTER, fromKey } from '../lib/time'
import type { Targets } from '../types'
import { MODE_META, cx } from './ui'

function Chip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={cx('flex min-w-0 flex-1 flex-col items-center rounded-xl px-2 py-1.5', tone)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-base font-bold leading-tight tabular-nums">{value}</span>
    </div>
  )
}

export function WeekBudgetCard({ week, targets }: { week: WeekSummary; targets: Targets }) {
  const health = week.remaining > 0 ? week.projected : week.actual
  const hm = HEALTH_META[health]
  const over = week.floorLeft < 0
  const missOver = week.miss > targets.miss
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-night-line dark:bg-night-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Weekly Budget
        </span>
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', hm.bg, hm.text)}>
          <span aria-hidden>{hm.emoji}</span>
          {hm.label}
          {week.remaining > 0 && <span className="font-medium opacity-70">• live</span>}
        </span>
      </div>
      <div className="flex gap-2">
        <Chip label="Ceiling" value={`${week.ceiling}/${targets.ceiling}`} tone="bg-ceiling/10 text-ceiling" />
        <Chip
          label="Floor Left"
          value={over ? `+${-week.floorLeft} over` : String(week.floorLeft)}
          tone={over ? 'bg-miss/10 text-miss' : 'bg-floor/10 text-floor'}
        />
        <Chip
          label="Miss"
          value={String(week.miss)}
          tone={missOver ? 'bg-miss/15 text-miss' : 'bg-slate-100 text-slate-500 dark:bg-night dark:text-slate-300'}
        />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
        <TrendingUp size={14} className={hm.text} aria-hidden />
        {week.forecast}
      </p>
    </div>
  )
}

export function WeekStrip({
  week,
  selected,
  onSelect,
}: {
  week: WeekSummary
  selected?: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-1" role="list" aria-label="This week">
      {week.days.map((d, i) => {
        const m = d.mode ? MODE_META[d.mode] : null
        const isSel = d.key === selected
        return (
          <button
            key={d.key}
            role="listitem"
            disabled={d.future}
            onClick={() => onSelect(d.key)}
            aria-label={`${d.key}${d.mode ? ` • ${m!.label}` : ''}`}
            className={cx(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl transition-colors',
              d.future ? 'opacity-40' : 'hover:bg-slate-100 dark:hover:bg-night-card',
              isSel && 'bg-white shadow-sm dark:bg-night-card',
            )}
          >
            <span
              className={cx(
                'text-[10px] font-semibold',
                d.isToday ? 'text-brand dark:text-accent' : 'text-slate-400',
              )}
            >
              {DOW_LETTER[i]}
            </span>
            <span
              className={cx(
                'flex size-8 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                m ? cx(m.bg, 'text-white') : 'bg-slate-200/70 text-slate-500 dark:bg-night-line dark:text-slate-300',
                d.isToday && 'ring-2 ring-brand ring-offset-2 ring-offset-paper dark:ring-accent dark:ring-offset-night',
              )}
            >
              {fromKey(d.key).getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

import { TrendingUp } from 'lucide-react'
import { HEALTH_META, type WeekSummary } from '../lib/stats'
import { DOW_SHORT, fromKey } from '../lib/time'
import type { Targets } from '../types'
import { MODE_META, cx } from './ui'

function Chip({ label, value, tone, note }: { label: string; value: string; tone: string; note?: string }) {
  return (
    <div className={cx('flex min-w-[84px] flex-col items-center justify-center rounded-xl px-3 py-2', tone)}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-lg font-bold leading-tight tabular-nums">{value}</span>
      {note && <span className="text-[10px] font-semibold opacity-75">{note}</span>}
    </div>
  )
}

/** Weekly budget + Mon–Sun navigator in one horizontal bar. */
export function WeekBar({
  week,
  targets,
  selected,
  onSelect,
}: {
  week: WeekSummary
  targets: Targets
  selected: string
  onSelect: (key: string) => void
}) {
  const health = week.remaining > 0 ? week.projected : week.actual
  const hm = HEALTH_META[health]
  const over = week.floorLeft < 0
  return (
    <section aria-label="Weekly budget" className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 xl:flex-row xl:items-center dark:border-night-line dark:bg-night-card">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[180px]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Weekly Budget</p>
          <span className={cx('mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold', hm.bg, hm.text)}>
            <span aria-hidden>{hm.emoji}</span>
            {hm.label}
            {week.remaining > 0 && <span className="text-xs font-medium opacity-70">• live</span>}
          </span>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <TrendingUp size={13} className={hm.text} aria-hidden />
            {week.forecast}
          </p>
        </div>
        <div className="flex gap-2">
          <Chip
            label="Ceiling"
            value={`${week.ceiling}/${targets.ceiling}`}
            tone="bg-ceiling/10 text-ceiling"
            note={week.planned.ceiling ? `+${week.planned.ceiling} planned` : undefined}
          />
          <Chip
            label="Floor Left"
            value={over ? `+${-week.floorLeft} over` : String(week.floorLeft)}
            tone={over || week.floorLeft - week.planned.floor < 0 ? 'bg-miss/10 text-miss' : 'bg-floor/10 text-floor'}
            note={week.planned.floor ? `−${week.planned.floor} planned` : undefined}
          />
          <Chip
            label="Miss"
            note={week.planned.miss ? `+${week.planned.miss} planned` : undefined}
            value={String(week.miss)}
            tone={week.miss > targets.miss ? 'bg-miss/15 text-miss' : 'bg-slate-100 text-slate-500 dark:bg-night dark:text-slate-300'}
          />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-7 gap-1.5 xl:ml-auto xl:max-w-[520px]" role="list" aria-label="This week">
        {week.days.map((d, i) => {
          const m = d.mode ? MODE_META[d.mode] : null
          const p = !m && d.plan ? MODE_META[d.plan] : null
          const isSel = d.key === selected
          return (
            <button
              key={d.key}
              role="listitem"
              onClick={() => onSelect(d.key)}
              aria-label={`${d.key}${m ? ` • ${m.label}` : p ? ` • Planned ${p.label}` : ''}`}
              aria-current={isSel ? 'date' : undefined}
              className={cx(
                'flex flex-col items-center gap-1 rounded-xl border-2 py-1.5 transition-colors',
                isSel ? 'border-brand bg-brand/5 dark:border-accent dark:bg-accent/5' : 'border-transparent hover:bg-slate-100 dark:hover:bg-night',
                d.future && !p && 'opacity-60',
              )}
            >
              <span className={cx('text-[9px] font-bold uppercase sm:text-[10px]', d.isToday ? 'text-brand dark:text-accent' : 'text-slate-400')}>
                {d.isToday ? 'Today' : DOW_SHORT[i]}
              </span>
              <span
                className={cx(
                  'flex size-9 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                  m
                    ? cx(m.bg, 'text-white')
                    : p
                      ? cx('border-2 border-dashed bg-white dark:bg-night', p.text, p.border)
                      : 'bg-slate-100 text-slate-500 dark:bg-night dark:text-slate-300',
                )}
              >
                {fromKey(d.key).getDate()}
              </span>
              <span className={cx('text-[9px] font-semibold uppercase', m ? m.text : p ? cx(p.text, 'opacity-80') : 'text-transparent')}>
                {m?.label ?? (p ? <><span className="md:hidden">{p.label}</span><span className="hidden md:inline">Plan {p.label}</span></> : '—')}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

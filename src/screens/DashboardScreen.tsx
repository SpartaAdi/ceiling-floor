import { useMemo, useState, type ReactNode } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { ChevronDown, ChevronLeft, ChevronRight, Flame, ShieldCheck, ThumbsDown, ThumbsUp, Trophy } from 'lucide-react'
import { useStore } from '../store/AppStore'
import {
  TIMEFRAME_LABELS,
  blockReport,
  breakdown,
  daysInRange,
  greenWeeks,
  habitWeek,
  monthGrid,
  nonMissStreak,
  rangeFor,
  strongest,
  weakest,
  type BlockStat,
  type Timeframe,
} from '../lib/stats'
import { DOW_LETTER, addDays, fmtLong, fmtMonth, fromKey, toKey, weekStartOf } from '../lib/time'
import { Card, CardTitle, MODE_META, Segmented, cx } from '../components/ui'
import { DaySheet } from '../components/DaySheet'

const COLORS = { ceiling: '#10B981', floor: '#F59E0B', miss: '#F43F5E' }

export function DashboardScreen({ now }: { now: Date }) {
  const { data } = useStore()
  const today = toKey(now)
  const [tf, setTf] = useState<Timeframe>('week')
  const [sheetDate, setSheetDate] = useState<string | null>(null)

  const range = useMemo(() => rangeFor(tf, data, today), [tf, data, today])
  const days = useMemo(() => daysInRange(data, range), [data, range])
  const bd = useMemo(() => breakdown(days), [days])
  const streak = useMemo(() => nonMissStreak(data, today), [data, today])
  const gw = useMemo(() => greenWeeks(data, today), [data, today])
  const report = useMemo(() => blockReport(days), [days])

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 bg-paper/90 px-4 pb-3 pt-safe backdrop-blur-md dark:bg-night/90">
        <div className="pb-2 pt-3">
          <h1 className="text-xl font-bold tracking-tight text-brand dark:text-white">Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {fmtLong(range[0])} – {fmtLong(range[1])} • {bd.total} logged
          </p>
        </div>
        <Segmented
          size="sm"
          value={tf}
          onChange={setTf}
          options={(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((v) => ({ value: v, label: TIMEFRAME_LABELS[v] }))}
        />
      </header>

      <div className="flex flex-col gap-3 pt-1">
        <Breakdown bd={bd} />

        <div className="grid grid-cols-2 gap-3">
          <MiniStat
            icon={<Flame size={18} className="text-floor" />}
            value={`${streak.current}d`}
            title="Non-Miss Streak"
            sub={`Best • ${streak.best}d`}
          />
          <MiniStat
            icon={<Trophy size={18} className="text-ceiling" />}
            value={String(gw.green)}
            title="Green Weeks"
            sub={`${gw.total} weeks closed`}
          />
        </div>

        <Heatmap today={today} onPick={setSheetDate} />
        <HabitMatrix today={today} />
        <BlockReport stats={report} />
      </div>

      <DaySheet date={sheetDate} onClose={() => setSheetDate(null)} />
    </>
  )
}

function MiniStat({ icon, value, title, sub }: { icon: ReactNode; value: string; title: string; sub: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-2xl font-bold tabular-nums text-brand dark:text-white">{value}</span>
      </div>
      <p className="mt-1 text-[13px] font-semibold text-brand dark:text-white">{title}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>
    </Card>
  )
}

function Breakdown({ bd }: { bd: ReturnType<typeof breakdown> }) {
  const pie = [
    { name: 'Ceiling', value: bd.ceiling, color: COLORS.ceiling },
    { name: 'Floor', value: bd.floor, color: COLORS.floor },
    { name: 'Miss', value: bd.miss, color: COLORS.miss },
  ]
  const rows = [
    { mode: 'ceiling' as const, pct: bd.pCeiling, n: bd.ceiling },
    { mode: 'floor' as const, pct: bd.pFloor, n: bd.floor },
    { mode: 'miss' as const, pct: bd.pMiss, n: bd.miss },
  ]
  return (
    <Card>
      <CardTitle title="Day Breakdown" sub="Ceiling • Floor • Miss" />
      <div className="flex items-center gap-4">
        <div className="relative size-[132px] shrink-0">
          {bd.total > 0 ? (
            <PieChart width={132} height={132}>
              <Pie
                data={pie}
                dataKey="value"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={bd.total > 1 ? 2 : 0}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {pie.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <div className="size-full rounded-full border-[20px] border-slate-100 dark:border-night" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-brand dark:text-white">{bd.total}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">days</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-2">
          {rows.map((r) => (
            <li key={r.mode} className={cx('rounded-xl px-3 py-1.5', MODE_META[r.mode].soft)}>
              <div className="flex items-baseline justify-between">
                <span className={cx('text-xs font-semibold', MODE_META[r.mode].text)}>{MODE_META[r.mode].label}</span>
                <span className={cx('text-lg font-bold tabular-nums', MODE_META[r.mode].text)}>{r.pct}%</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{r.n} days</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function Heatmap({ today, onPick }: { today: string; onPick: (d: string) => void }) {
  const { data } = useStore()
  const [month, setMonth] = useState(today.slice(0, 8) + '01')
  const cells = useMemo(() => monthGrid(month), [month])
  const shift = (n: number) => {
    const d = fromKey(month)
    setMonth(toKey(new Date(d.getFullYear(), d.getMonth() + n, 1)))
  }
  const isCurrent = month.slice(0, 7) === today.slice(0, 7)
  return (
    <Card>
      <CardTitle
        title="Calendar"
        sub={fmtMonth(month)}
        right={
          <div className="-mr-2 -mt-2 flex">
            <button aria-label="Previous month" onClick={() => shift(-1)} className="flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-night">
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next month"
              disabled={isCurrent}
              onClick={() => shift(1)}
              className="flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-night"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DOW_LETTER.map((l, i) => (
          <span key={i} className="text-[10px] font-semibold text-slate-400">
            {l}
          </span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={i} />
          const mode = data.days[k]?.mode
          const future = k > today
          return (
            <button
              key={k}
              disabled={future}
              onClick={() => onPick(k)}
              aria-label={`${k}${mode ? ` • ${MODE_META[mode].label}` : ''}`}
              className={cx(
                'flex aspect-square min-h-9 items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition-transform active:scale-90',
                mode ? cx(MODE_META[mode].bg, 'text-white') : 'bg-slate-100 text-slate-500 dark:bg-night dark:text-slate-400',
                future && 'opacity-35',
                k === today && 'ring-2 ring-brand ring-offset-1 ring-offset-white dark:ring-accent dark:ring-offset-night-card',
              )}
            >
              {fromKey(k).getDate()}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        {(['ceiling', 'floor', 'miss'] as const).map((m) => (
          <span key={m} className="inline-flex items-center gap-1">
            <span className={cx('size-2.5 rounded-sm', MODE_META[m].bg)} /> {MODE_META[m].label}
          </span>
        ))}
      </div>
    </Card>
  )
}

function HabitMatrix({ today }: { today: string }) {
  const { data, toggleHabit, toggleCare } = useStore()
  const [ws, setWs] = useState(weekStartOf(today))
  const hw = useMemo(() => habitWeek(data, ws, today), [data, ws, today])
  const isCurrent = ws === weekStartOf(today)
  const careDate = isCurrent ? today : addDays(ws, 5)
  return (
    <Card>
      <CardTitle
        title="Habit Matrix"
        sub={`${isCurrent ? 'This week' : 'Week of ' + fmtLong(ws)} • Tap to edit`}
        right={
          <div className="-mr-2 -mt-2 flex">
            <button aria-label="Previous week" onClick={() => setWs(addDays(ws, -7))} className="flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-night">
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next week"
              disabled={isCurrent}
              onClick={() => setWs(addDays(ws, 7))}
              className="flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-night"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))_2.75rem] items-center gap-y-1">
        <span />
        {DOW_LETTER.map((l, i) => (
          <span key={i} className={cx('text-center text-[10px] font-semibold', hw.keys[i] === today ? 'text-brand dark:text-accent' : 'text-slate-400')}>
            {l}
          </span>
        ))}
        <span className="text-right text-[10px] font-semibold text-slate-400">%</span>
        {hw.daily.map((row) => (
          <div key={row.habit.id} className="contents">
            <span className="truncate text-[13px] font-medium text-brand dark:text-white">{row.habit.label}</span>
            {row.cells.map((c) => (
              <button
                key={c.key}
                disabled={c.future}
                onClick={() => toggleHabit(c.key, row.habit.id)}
                aria-label={`${row.habit.label} ${c.key} ${c.done ? 'done' : 'not done'}`}
                aria-pressed={c.done}
                className="flex min-h-10 items-center justify-center disabled:opacity-30"
              >
                <span
                  className={cx(
                    'size-5 rounded-full transition-all',
                    c.done ? 'bg-ceiling' : 'border-2 border-slate-200 dark:border-night-line',
                  )}
                />
              </button>
            ))}
            <span
              className={cx(
                'text-right text-xs font-bold tabular-nums',
                row.pct >= 80 ? 'text-ceiling' : row.pct >= 50 ? 'text-floor' : 'text-miss',
              )}
            >
              {row.pct}%
            </span>
          </div>
        ))}
      </div>
      {hw.weekly.length > 0 && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-night-line">
          {hw.weekly.map((w) => (
            <button
              key={w.habit.id}
              onClick={() => toggleCare(w.doneOn ?? careDate, w.habit.id)}
              aria-pressed={!!w.doneOn}
              className={cx(
                'flex min-h-11 flex-1 items-center justify-between gap-2 rounded-xl border px-3 text-[13px] font-semibold',
                w.doneOn
                  ? 'border-ceiling bg-ceiling/10 text-ceiling'
                  : 'border-slate-200 text-slate-500 dark:border-night-line dark:text-slate-300',
              )}
            >
              <span className="truncate">{w.habit.label}</span>
              <span className="tabular-nums">{w.doneOn ? '1/1' : '0/1'}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function StatRow({ s, tone }: { s: BlockStat; tone: 'good' | 'bad' }) {
  return (
    <li className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-brand dark:text-white">{s.title}</span>
          <span className={cx('text-xs font-bold tabular-nums', tone === 'good' ? 'text-ceiling' : 'text-miss')}>{s.pct}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
          <div
            className={cx('h-full rounded-full', tone === 'good' ? 'bg-ceiling' : s.pct >= 70 ? 'bg-floor' : 'bg-miss')}
            style={{ width: `${s.pct}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400">
          {s.done}/{s.total} done • {s.total - s.done} missed
        </span>
      </div>
    </li>
  )
}

function BlockReport({ stats }: { stats: BlockStat[] }) {
  const [showAll, setShowAll] = useState(false)
  const top = strongest(stats)
  const low = weakest(stats)
  const all = [...stats].sort((a, b) => b.pct - a.pct || a.title.localeCompare(b.title))
  return (
    <Card>
      <CardTitle title="Block Report" sub="Ceiling • Floor days • Red ticks count" right={<ShieldCheck size={18} className="text-slate-300" />} />
      {stats.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No Ceiling or Floor days yet</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ceiling">
              <ThumbsUp size={12} /> Strongest
            </p>
            <ul className="flex flex-col gap-2.5">
              {top.map((s) => (
                <StatRow key={s.title} s={s} tone="good" />
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-miss">
              <ThumbsDown size={12} /> Most Missed
            </p>
            {low.length ? (
              <ul className="flex flex-col gap-2.5">
                {low.map((s) => (
                  <StatRow key={s.title} s={s} tone="bad" />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No missed blocks • Clean run</p>
            )}
          </div>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-night dark:text-slate-300"
          >
            {showAll ? 'Hide' : `All ${stats.length} blocks`}
            <ChevronDown size={14} className={cx('transition-transform', showAll && 'rotate-180')} />
          </button>
          {showAll && (
            <ul className="flex flex-col gap-2.5">
              {all.map((s) => (
                <StatRow key={s.title} s={s} tone={s.pct >= 85 ? 'good' : 'bad'} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

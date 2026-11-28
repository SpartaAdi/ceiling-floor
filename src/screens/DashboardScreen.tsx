import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Flame,
  Info,
  Lightbulb,
  Minus,
  ShieldCheck,
  Sprout,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  XCircle,
} from 'lucide-react'
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
import {
  buildInsights,
  computeFacets,
  daysBetween,
  facetStatus,
  growthHours,
  lifeScore,
  logsIn,
  modeComparison,
  previousRange,
  weekdayProfile,
  weeklySeries,
  type FacetStat,
  type FacetStatus,
  type Insight,
  type WeekPoint,
} from '../lib/insights'
import { ADHERENCE_TARGET, FACETS, GROWTH_FACETS, facetTargets, fmtH, type FacetDef } from '../lib/facets'
import { DOW_LETTER, addDays, fmtLong, fmtMonth, fromKey, toKey, weekStartOf } from '../lib/time'
import { Card, CardTitle, EmptyState, MODE_META, PageHeader, Segmented, cx } from '../components/ui'
import { useNav } from '../nav'
import { GoalRow } from '../components/GoalBits'
import { activeGoals, evaluateGoal } from '../lib/goals'

const MODE_HEX = { ceiling: '#10B981', floor: '#F59E0B', miss: '#F43F5E' }

export function DashboardScreen({ now, onOpenDay }: { now: Date; onOpenDay: (d: string) => void }) {
  const { data } = useStore()
  const today = toKey(now)
  const [tf, setTf] = useState<Timeframe>('week')

  const m = useMemo(() => {
    const range = rangeFor(tf, data, today)
    const days = daysInRange(data, range)
    const rangeDays = daysBetween(range[0], range[1]) + 1
    const prevR = previousRange(tf, range)
    const prevDays = prevR ? logsIn(data, prevR) : null
    const hasPrev = !!prevDays?.some((d) => d.mode)
    const facets = computeFacets(data, days)
    const prevFacets = hasPrev ? computeFacets(data, prevDays!) : null
    return {
      range,
      days,
      rangeDays,
      facets,
      prevFacets,
      life: lifeScore(facets),
      prevLife: prevFacets ? lifeScore(prevFacets) : null,
      growth: growthHours(facets),
      prevGrowth: prevFacets ? growthHours(prevFacets) : null,
      bd: breakdown(days),
      prevBd: hasPrev ? breakdown(prevDays!) : null,
      insights: buildInsights({ data, days, prevDays, rangeDays }),
      weekday: weekdayProfile(days),
      mc: modeComparison(data, days),
      report: blockReport(days),
      wins: days.filter((d) => d.reflection?.win).slice(-6).reverse(),
    }
  }, [data, tf, today])

  const series = useMemo(() => weeklySeries(data, today, 8), [data, today])
  const streak = useMemo(() => nonMissStreak(data, today), [data, today])
  const gw = useMemo(() => greenWeeks(data, today), [data, today])
  const targets = facetTargets(data)
  const growthTarget = GROWTH_FACETS.reduce((a, f) => a + targets[f.id], 0)

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub={`${fmtLong(m.range[0])} – ${fmtLong(m.range[1])} · ${m.rangeDays} day${m.rangeDays === 1 ? '' : 's'} • ${m.bd.total} logged`}
        right={
          <div className="w-full md:w-[420px]">
            <Segmented
              size="sm"
              value={tf}
              onChange={setTf}
              options={(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((v) => ({ value: v, label: TIMEFRAME_LABELS[v] }))}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
          <Kpi
            icon={<Target size={18} className="text-brand dark:text-accent" />}
            label="Life Score"
            value={m.life === null ? '—' : `${m.life}`}
            unit={m.life === null ? '' : '/100'}
            sub="Avg execution • All facets"
            delta={m.life !== null && m.prevLife !== null ? m.life - m.prevLife : null}
            deltaFmt={(d) => `${d > 0 ? '+' : ''}${d} pts`}
          />
          <Kpi
            icon={<Sprout size={18} className="text-ceiling-ink" />}
            label="Growth Hours"
            value={fmtH(m.growth)}
            sub={`Deep • Fitness • Mind • Reading`}
            delta={m.prevGrowth !== null ? m.growth - m.prevGrowth : null}
            deltaFmt={(d) => `${d > 0 ? '+' : '−'}${fmtH(Math.abs(d))}`}
          />
          <Kpi
            icon={<CheckCircle2 size={18} className="text-ceiling-ink" />}
            label="Ceiling Rate"
            value={`${m.bd.pCeiling}%`}
            sub={`${m.bd.ceiling} Ceiling • ${m.bd.floor} Floor • ${m.bd.miss} Miss`}
            delta={m.prevBd && m.prevBd.total ? m.bd.pCeiling - m.prevBd.pCeiling : null}
            deltaFmt={(d) => `${d > 0 ? '+' : ''}${d} pts`}
          />
          <Kpi icon={<Flame size={18} className="text-floor-ink" />} label="Non-Miss Streak" value={`${streak.current}`} unit=" days" sub={`Best • ${streak.best} days`} />
          <Kpi icon={<Trophy size={18} className="text-amber-600 dark:text-accent" />} label="Green Weeks" value={`${gw.green}`} sub={`${gw.total} weeks closed`} />
        </div>

        {/* Life facets */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-brand dark:text-white">Life Facets</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Hours vs weekly target • Partial credit from every ✓ and ✕ • {m.prevFacets ? 'Change vs previous period' : 'No previous period yet'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {FACETS.map((f) => (
              <FacetCard
                key={f.id}
                def={f}
                stat={m.facets[f.id]}
                prev={m.prevFacets?.[f.id] ?? null}
                rangeDays={m.rangeDays}
                target={targets[f.id]}
                series={series}
              />
            ))}
          </div>
        </section>

        <GoalsSummary today={today} />

        {/* Insights + weekly trend */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <InsightsPanel insights={m.insights} />
          <GrowthTrend series={series} target={growthTarget} />
        </div>

        {/* Weekday + day mix + wins */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <WeekdayChart rows={m.weekday} />
          <DayMix bd={m.bd} mc={m.mc} />
          <WinsCard wins={m.wins} onOpenDay={onOpenDay} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Heatmap today={today} onPick={onOpenDay} />
          <HabitMatrix today={today} />
        </div>

        <BlockReport stats={m.report} />
      </div>
    </>
  )
}

/* ---------- KPI ---------- */

function Delta({ value, fmt, invert = false }: { value: number | null; fmt: (d: number) => string; invert?: boolean }) {
  if (value === null) return <span className="text-[11px] text-slate-600 dark:text-slate-400">No prior data</span>
  const flat = Math.abs(value) < 0.05
  const good = invert ? value < 0 : value > 0
  return (
    <span
      className={cx(
        'inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
        flat ? 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-400' : good ? 'bg-ceiling/10 text-ceiling-ink' : 'bg-miss/10 text-miss-ink',
      )}
    >
      {flat ? <Minus size={11} /> : value > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {flat ? 'Flat' : fmt(value)}
    </span>
  )
}

function Kpi({
  icon,
  label,
  value,
  unit,
  sub,
  delta,
  deltaFmt,
}: {
  icon: ReactNode
  label: string
  value: string
  unit?: string
  sub: string
  delta?: number | null
  deltaFmt?: (d: number) => string
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold tracking-tight tabular-nums text-brand dark:text-white">
        {value}
        {unit && <span className="text-base font-semibold text-slate-600 dark:text-slate-400">{unit}</span>}
      </p>
      <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">{sub}</p>
      {deltaFmt && delta !== undefined && (
        <div className="mt-1">
          <Delta value={delta} fmt={deltaFmt} />
        </div>
      )}
    </Card>
  )
}

/* ---------- Facet card ---------- */

const STATUS_META: Record<FacetStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  'on-track': { label: 'On track', cls: 'bg-ceiling/10 text-ceiling-ink', Icon: CheckCircle2 },
  behind: { label: 'Behind', cls: 'bg-floor/10 text-floor-ink', Icon: AlertTriangle },
  'off-track': { label: 'Off track', cls: 'bg-miss/10 text-miss-ink', Icon: XCircle },
  'no-data': { label: 'No data', cls: 'bg-slate-100 text-slate-600 dark:text-slate-400 dark:bg-night', Icon: CircleDashed },
}

function Sparkline({ values, color, label }: { values: (number | null)[]; color: string; label: string }) {
  const W = 104
  const H = 30
  const nums = values.map((v) => v ?? 0)
  const max = Math.max(...nums, 1)
  const pts = nums.map((v, i) => [(i / (nums.length - 1)) * (W - 6) + 3, H - 3 - (v / max) * (H - 6)] as const)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}, last 8 weeks: ${nums.join(', ')}`}>
      <title>{`Last 8 weeks: ${nums.join(' • ')}`}</title>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
    </svg>
  )
}

function FacetCard({
  def,
  stat,
  prev,
  rangeDays,
  target,
  series,
}: {
  def: FacetDef
  stat: FacetStat
  prev: FacetStat | null
  rangeDays: number
  target: number
  series: WeekPoint[]
}) {
  const { data } = useStore()
  const { status, expected } = facetStatus(def.id, stat, rangeDays, data)
  const sm = STATUS_META[status]
  const hours = def.metric === 'hours'
  const progress = hours ? (expected ? Math.min(100, (stat.hours / expected) * 100) : 0) : (stat.score ?? 0)
  const spark = series.map((w) => (hours ? w.hours[def.id] : w.score[def.id]))
  const delta = prev ? (hours ? stat.hours - prev.hours : stat.score !== null && prev.score !== null ? stat.score - prev.score : null) : null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${def.color}1A`, color: def.color }}>
          <def.Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-brand dark:text-white">{def.label}</h3>
          <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">{def.sub}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-brand dark:text-white">
            {hours ? fmtH(stat.hours) : stat.score === null ? '—' : `${stat.score}%`}
          </span>
          <span className="block truncate text-xs text-slate-600 dark:text-slate-400">
            {hours ? `of ${fmtH(expected ?? 0)} target${rangeDays !== 7 ? ' pace' : ''}` : `kept • target ${ADHERENCE_TARGET}%`}
          </span>
        </div>
        <span className={cx('mb-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', sm.cls)}>
          <sm.Icon size={12} /> {sm.label}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: def.color }} />
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400">
        {hours
          ? stat.blockPct === null
            ? 'Nothing planned yet'
            : `${stat.blockPct}% of planned done • ${fmtH(target)}/wk goal`
          : [stat.blockPct !== null && `${def.id === 'nutrition' ? 'Meals' : 'Blocks'} ${stat.blockPct}%`, stat.habitPossible > 0 && `Habits ${stat.habitDone}/${stat.habitPossible}`]
              .filter(Boolean)
              .join(' • ') || 'Nothing tracked yet'}
      </p>

      <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3 dark:border-night-line">
        <Delta value={delta} fmt={(d) => (hours ? `${d > 0 ? '+' : '−'}${fmtH(Math.abs(d))}` : `${d > 0 ? '+' : ''}${d} pts`)} />
        <Sparkline values={spark} color={def.color} label={def.label} />
      </div>
    </Card>
  )
}

/* ---------- Insights ---------- */

function InsightsPanel({ insights }: { insights: Insight[] }) {
  const { go } = useNav()
  const wins = insights.filter((i) => i.tone === 'good').slice(0, 4)
  const watch = insights.filter((i) => i.tone === 'bad').slice(0, 4)
  const notes = insights.filter((i) => i.tone === 'info').slice(0, 3)
  const Row = ({ i }: { i: Insight }) => {
    const Icon = i.tone === 'good' ? ArrowUpRight : i.tone === 'bad' ? AlertTriangle : Info
    return (
      <li className="flex items-start gap-2.5">
        <span
          className={cx(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg',
            i.tone === 'good' ? 'bg-ceiling/10 text-ceiling-ink' : i.tone === 'bad' ? 'bg-miss/10 text-miss-ink' : 'bg-brand/10 text-brand dark:bg-accent/10 dark:text-accent',
          )}
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand dark:text-white">{i.title}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{i.sub}</p>
        </div>
      </li>
    )
  }
  const Group = ({ title, items, cls }: { title: string; items: Insight[]; cls: string }) =>
    items.length ? (
      <div>
        <p className={cx('mb-2 text-[11px] font-bold uppercase tracking-wider', cls)}>{title}</p>
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <Row key={i.title} i={i} />
          ))}
        </ul>
      </div>
    ) : null
  return (
    <Card>
      <CardTitle title="Insights" sub="What's working • What needs attention" right={<Lightbulb size={18} className="text-amber-600 dark:text-accent" />} />
      <div className="flex flex-col gap-5">
        <Group title="Progressing" items={wins} cls="text-ceiling-ink" />
        <Group title="Falling behind" items={watch} cls="text-miss-ink" />
        <Group title="Patterns" items={notes.filter((n) => n.title !== 'Log a few more days')} cls="text-slate-600 dark:text-slate-400" />
        {(insights.length === 0 || (insights.length === 1 && insights[0].title === 'Log a few more days')) && (
          <EmptyState
            compact
            icon={<Lightbulb size={22} />}
            title="Insights unlock after 3 logged days"
            tip={insights[0]?.sub ?? 'Log a few days to see what is working'}
            action={{ label: 'Log today', onClick: () => go('today') }}
          />
        )}
      </div>
    </Card>
  )
}

/* ---------- Charts ---------- */

function ChartTooltip({ active, payload, label, unit = 'h' }: { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: Record<string, unknown> }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-night-line dark:bg-night-card">
      <p className="mb-1 font-semibold text-brand dark:text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          {p.color && <span className="size-2.5 rounded-sm" style={{ background: p.color }} />}
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold tabular-nums">
            {p.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  )
}

function GrowthTrend({ series, target }: { series: WeekPoint[]; target: number }) {
  const rows = series.map((w) => ({ label: w.label, ...Object.fromEntries(GROWTH_FACETS.map((f) => [f.id, w.hours[f.id]])) }))
  const last = series[series.length - 1]
  return (
    <Card>
      <CardTitle title="Growth Hours • 8 Weeks" sub={`Weekly target ${fmtH(target)} • This week ${fmtH(last.growth)}`} />
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1" aria-hidden>
        {GROWTH_FACETS.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="size-2.5 rounded-sm" style={{ background: f.color }} /> {f.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="w-4 border-t-2 border-dashed border-slate-400" /> Target
        </span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-ink)', fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-ink)', fontSize: 11 }} unit="h" />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }} />
            <ReferenceLine y={target} stroke="#94A3B8" strokeDasharray="5 4" strokeWidth={1.5} />
            {GROWTH_FACETS.map((f, i) => (
              <Bar
                key={f.id}
                dataKey={f.id}
                name={f.label}
                stackId="g"
                fill={f.color}
                stroke="var(--chart-surface)"
                strokeWidth={2}
                maxBarSize={44}
                radius={i === GROWTH_FACETS.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function WeekdayChart({ rows }: { rows: { label: string; pct: number | null; days: number }[] }) {
  const data = rows.map((r) => ({ label: r.label, pct: r.pct ?? 0, has: r.pct !== null }))
  const valid = rows.filter((r) => r.pct !== null)
  const avg = valid.length ? Math.round(valid.reduce((a, r) => a + r.pct!, 0) / valid.length) : 0
  const lo = valid.length >= 2 ? valid.reduce((a, r) => (r.pct! < a.pct! ? r : a)) : null
  return (
    <Card>
      <CardTitle title="Weekday Rhythm" sub={lo ? `Average ${avg}% • Weakest ${lo.label} ${lo.pct}%` : 'Block completion by weekday'} />
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-ink)', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-ink)', fontSize: 11 }} unit="%" />
            <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }} />
            {valid.length > 0 && <ReferenceLine y={avg} stroke="#94A3B8" strokeDasharray="5 4" strokeWidth={1.5} />}
            <Bar dataKey="pct" name="Done" maxBarSize={32} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.label} fill={!d.has ? 'transparent' : lo && d.label === lo.label ? '#F43F5E' : 'var(--color-brand-2)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function DayMix({ bd, mc }: { bd: ReturnType<typeof breakdown>; mc: ReturnType<typeof modeComparison> }) {
  const pie = [
    { name: 'Ceiling', value: bd.ceiling, color: MODE_HEX.ceiling },
    { name: 'Floor', value: bd.floor, color: MODE_HEX.floor },
    { name: 'Miss', value: bd.miss, color: MODE_HEX.miss },
  ]
  const rows = (['ceiling', 'floor', 'miss'] as const).map((k) => ({ k, ...mc[k], pct: k === 'ceiling' ? bd.pCeiling : k === 'floor' ? bd.pFloor : bd.pMiss }))
  return (
    <Card>
      <CardTitle title="Day Mix" sub="Share • Growth per day • Energy" />
      <div className="flex flex-col items-center gap-4 min-[420px]:flex-row">
        <div className="relative size-[120px] shrink-0">
          {bd.total > 0 ? (
            <PieChart width={120} height={120}>
              <Pie data={pie} dataKey="value" innerRadius={40} outerRadius={58} paddingAngle={bd.total > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
                {pie.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip unit=" days" />} />
            </PieChart>
          ) : (
            <div className="size-full rounded-full border-[18px] border-slate-100 dark:border-night" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums text-brand dark:text-white">{bd.total}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">days</span>
          </div>
        </div>
        <table className="w-full min-w-0 text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="pb-1.5 font-semibold">Mode</th>
              <th className="pb-1.5 pl-3 text-right font-semibold">Share</th>
              <th className="pb-1.5 pl-3 text-right font-semibold">Growth</th>
              <th className="pb-1.5 pl-3 text-right font-semibold">Energy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-slate-100 dark:border-night-line">
                <td className="py-1.5">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-brand dark:text-white">
                    <span className={cx('size-2.5 rounded-sm', MODE_META[r.k].bg)} /> {MODE_META[r.k].label}
                  </span>
                </td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.pct}%</td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.growth === null ? '—' : fmtH(r.growth)}</td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.energy === null ? '—' : r.energy.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function WinsCard({ wins, onOpenDay }: { wins: { date: string; reflection?: { win?: string } }[]; onOpenDay: (d: string) => void }) {
  const { go } = useNav()
  return (
    <Card>
      <CardTitle title="Recent Wins" sub="From your daily check-ins" right={<Trophy size={18} className="text-amber-600 dark:text-accent" />} />
      {wins.length ? (
        <ul className="flex flex-col gap-1">
          {wins.map((d) => (
            <li key={d.date}>
              <button onClick={() => onOpenDay(d.date)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-night">
                <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-600 dark:text-slate-400">{fmtLong(d.date).replace(/^\w+,?\s/, '')}</span>
                <span className="truncate text-sm text-brand dark:text-white">{d.reflection!.win}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={<Trophy size={22} />} title="No wins logged yet" tip="Note one good thing in today's check-in" action={{ label: 'Open check-in', onClick: () => go('today') }} />
      )}
    </Card>
  )
}

/* ---------- Calendar ---------- */

function Heatmap({ today, onPick }: { today: string; onPick: (d: string) => void }) {
  const { data } = useStore()
  const [month, setMonth] = useState(today.slice(0, 8) + '01')
  const cells = useMemo(() => monthGrid(month), [month])
  const shift = (n: number) => {
    const d = fromKey(month)
    setMonth(toKey(new Date(d.getFullYear(), d.getMonth() + n, 1)))
  }
  return (
    <Card className="max-sm:p-3">
      <CardTitle
        title="Calendar"
        sub={`${fmtMonth(month)} • Click a day to open or plan it`}
        right={
          <div className="-mr-1 -mt-1 flex">
            <IconBtn label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </IconBtn>
            <IconBtn label="Next month" onClick={() => shift(1)} disabled={month.slice(0, 7) > today.slice(0, 7)}>
              <ChevronRight size={18} />
            </IconBtn>
          </div>
        }
      />
      <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {DOW_LETTER.map((l, i) => (
          <span key={i} className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {l}
          </span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={i} />
          const day = data.days[k]
          const mode = day?.mode
          const plan = !mode ? day?.plan : undefined
          const future = k > today
          return (
            <button
              key={k}
              onClick={() => onPick(k)}
              title={mode ? `${MODE_META[mode].label}${day?.energy ? ` • Energy ${day.energy}` : ''}` : plan ? `Planned ${MODE_META[plan].label}` : future ? 'Plan this day' : 'Not logged'}
              aria-label={`${k}${mode ? ` • ${MODE_META[mode].label}` : plan ? ` • Planned ${MODE_META[plan].label}` : ''}`}
              className={cx(
                'flex h-10 items-center justify-center rounded-xl text-xs font-semibold tabular-nums transition-transform hover:scale-105',
                mode
                  ? cx(MODE_META[mode].solid, 'text-white')
                  : plan
                    ? cx('border-2 border-dashed bg-white dark:bg-night', MODE_META[plan].border, MODE_META[plan].text)
                    : 'bg-slate-100 text-slate-600 dark:bg-night dark:text-slate-400',
                future && !plan && 'opacity-50',
                k === today && 'ring-2 ring-brand ring-offset-2 ring-offset-white dark:ring-accent dark:ring-offset-night-card',
              )}
            >
              {fromKey(k).getDate()}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
        {(['ceiling', 'floor', 'miss'] as const).map((md) => (
          <span key={md} className="inline-flex items-center gap-1">
            <span className={cx('size-2.5 rounded-sm', MODE_META[md].bg)} /> {MODE_META[md].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm border border-dashed border-slate-400" /> Planned
        </span>
      </div>
    </Card>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-brand disabled:opacity-30 dark:hover:bg-night dark:hover:text-white"
    >
      {children}
    </button>
  )
}

/* ---------- Habit matrix ---------- */

const pctTone = (pct: number) => (pct >= 80 ? 'text-ceiling-ink' : pct >= 50 ? 'text-floor-ink' : 'text-miss-ink')

function HabitDot({
  cell,
  label,
  letter,
  isToday,
  onToggle,
}: {
  cell: { key: string; future: boolean; done: boolean }
  label: string
  letter?: string
  isToday?: boolean
  onToggle: () => void
}) {
  return (
    <button
      disabled={cell.future}
      onClick={onToggle}
      aria-label={`${label} ${cell.key} ${cell.done ? 'done' : 'not done'}`}
      aria-pressed={cell.done}
      className="group flex flex-col items-center justify-center gap-0.5 disabled:opacity-30"
    >
      {letter && <span className={cx('text-[10px] font-semibold', isToday ? 'text-brand dark:text-accent' : 'text-slate-600 dark:text-slate-400')}>{letter}</span>}
      <span
        className={cx(
          'size-5 rounded-full transition-all group-hover:scale-110',
          cell.done ? 'bg-ceiling' : 'border-2 border-slate-300 group-hover:border-slate-500 dark:border-night-line',
        )}
      />
    </button>
  )
}

function HabitMatrix({ today }: { today: string }) {
  const { data, toggleHabit, toggleCare } = useStore()
  const [ws, setWs] = useState(weekStartOf(today))
  const hw = useMemo(() => habitWeek(data, ws, today), [data, ws, today])
  const isCurrent = ws === weekStartOf(today)
  const careDate = isCurrent ? today : addDays(ws, 5)
  return (
    <Card className="max-sm:p-3">
      <CardTitle
        title="Habit Matrix"
        sub={`${isCurrent ? 'This week' : 'Week of ' + fmtLong(ws)} • Tap a dot to edit`}
        right={
          <div className="-mr-1 -mt-1 flex">
            <IconBtn label="Previous week" onClick={() => setWs(addDays(ws, -7))}>
              <ChevronLeft size={18} />
            </IconBtn>
            <IconBtn label="Next week" onClick={() => setWs(addDays(ws, 7))} disabled={isCurrent}>
              <ChevronRight size={18} />
            </IconBtn>
          </div>
        }
      />
      {/* Phone: one row per habit so seven 44px dots fit */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {hw.daily.map((row) => (
          <li key={row.habit.id}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-brand dark:text-white">{row.habit.label}</span>
              <span className={cx('text-xs font-bold tabular-nums', pctTone(row.pct))}>{row.pct}%</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {row.cells.map((c, i) => (
                <HabitDot key={c.key} cell={c} label={row.habit.label} letter={DOW_LETTER[i]} isToday={c.key === today} onToggle={() => toggleHabit(c.key, row.habit.id)} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {/* Wider screens: compact matrix */}
      <div className="hidden grid-cols-[6.5rem_repeat(7,minmax(0,1fr))_3rem] items-center gap-y-1 sm:grid">
        <span />
        {DOW_LETTER.map((l, i) => (
          <span key={i} className={cx('text-center text-[10px] font-semibold', hw.keys[i] === today ? 'text-brand dark:text-accent' : 'text-slate-600 dark:text-slate-400')}>
            {l}
          </span>
        ))}
        <span className="text-right text-[10px] font-semibold text-slate-600 dark:text-slate-400">%</span>
        {hw.daily.map((row) => (
          <div key={row.habit.id} className="contents">
            <span className="truncate text-[13px] font-medium text-brand dark:text-white">{row.habit.label}</span>
            {row.cells.map((c) => (
              <HabitDot key={c.key} cell={c} label={row.habit.label} onToggle={() => toggleHabit(c.key, row.habit.id)} />
            ))}
            <span className={cx('text-right text-xs font-bold tabular-nums', pctTone(row.pct))}>{row.pct}%</span>
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
                'flex min-h-11 flex-1 items-center justify-between gap-2 rounded-xl border-2 px-3 text-[13px] font-semibold',
                w.doneOn ? 'border-ceiling bg-ceiling/10 text-ceiling-ink' : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-300',
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

/* ---------- Block report ---------- */

function StatRow({ s, tone }: { s: BlockStat; tone: 'good' | 'bad' }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-brand dark:text-white">{s.title}</span>
        <span className={cx('text-xs font-bold tabular-nums', tone === 'good' ? 'text-ceiling-ink' : 'text-miss-ink')}>{s.pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
        <div className={cx('h-full rounded-full', tone === 'good' ? 'bg-ceiling' : s.pct >= 70 ? 'bg-floor' : 'bg-miss')} style={{ width: `${s.pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-600 dark:text-slate-400">
        {s.done}/{s.total} done • {s.total - s.done} missed
      </span>
    </li>
  )
}

function BlockReport({ stats }: { stats: BlockStat[] }) {
  const { go } = useNav()
  const [showAll, setShowAll] = useState(false)
  const top = strongest(stats)
  const low = weakest(stats)
  const all = [...stats].sort((a, b) => b.pct - a.pct || a.title.localeCompare(b.title))
  return (
    <Card>
      <CardTitle title="Block Report" sub="Ceiling & Floor days • Every ✕ counts" />
      {stats.length === 0 ? (
        <EmptyState compact icon={<ShieldCheck size={22} />} title="No logged days yet" tip="Log Ceiling or Floor days to see your strongest and weakest blocks" action={{ label: 'Log today', onClick: () => go('today') }} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ceiling-ink">
                <ThumbsUp size={12} /> Strongest
              </p>
              <ul className="flex flex-col gap-3">
                {top.map((s) => (
                  <StatRow key={s.title} s={s} tone="good" />
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-miss-ink">
                <ThumbsDown size={12} /> Most missed
              </p>
              {low.length ? (
                <ul className="flex flex-col gap-3">
                  {low.map((s) => (
                    <StatRow key={s.title} s={s} tone="bad" />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">No missed blocks • Clean run</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:bg-night dark:text-slate-300"
          >
            {showAll ? 'Hide' : `All ${stats.length} blocks`}
            <ChevronDown size={14} className={cx('transition-transform', showAll && 'rotate-180')} />
          </button>
          {showAll && (
            <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              {all.map((s) => (
                <StatRow key={s.title} s={s} tone={s.pct >= 85 ? 'good' : 'bad'} />
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}


function GoalsSummary({ today }: { today: string }) {
  const { data } = useStore()
  const goals = activeGoals(data).map((g) => ({ goal: g, ev: evaluateGoal(data, g, today) }))
  if (!goals.length) return null
  const order = { 'off-track': 0, behind: 1, 'on-track': 2, upcoming: 3, missed: 4, done: 5 }
  goals.sort((a, b) => order[a.ev.status] - order[b.ev.status])
  const hit = goals.filter((g) => g.ev.status === 'done' || g.ev.status === 'on-track').length
  return (
    <Card>
      <CardTitle title="Goals" sub={`${hit} of ${goals.length} done or on track • Current period`} right={<Target size={18} className="text-brand dark:text-accent" />} />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
        {goals.map(({ goal, ev }) => (
          <GoalRow key={goal.id} goal={goal} ev={ev} />
        ))}
      </ul>
    </Card>
  )
}

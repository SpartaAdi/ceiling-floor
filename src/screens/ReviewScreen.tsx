import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarCheck2, Check, ChevronLeft, ChevronRight, ClipboardCheck, Lightbulb, Minus, Target, Trophy } from 'lucide-react'
import type { FacetId, WeekPriority } from '../types'
import { useStore } from '../store/AppStore'
import { weekReview } from '../lib/review'
import { FACETS, FACET_BY_ID, facetTargets, fmtH } from '../lib/facets'
import { HEALTH_META } from '../lib/stats'
import { DOW_SHORT, addDays, fmtLong, fromKey, toKey, weekStartOf } from '../lib/time'
import { Card, CardTitle, EmptyState, Label, MODE_META, PageHeader, cx } from '../components/ui'
import { useNav } from '../nav'
import { GoalRow } from '../components/GoalBits'

export function ReviewScreen({ now, ws, setWs }: { now: Date; ws: string; setWs: (ws: string) => void }) {
  const { data } = useStore()
  const { go } = useNav()
  const today = toKey(now)
  const current = weekStartOf(today)
  const r = useMemo(() => weekReview(data, ws, today), [data, ws, today])
  const reviewed = data.weeks[ws]?.review?.completedAt
  const health = r.summary.remaining > 0 ? r.summary.projected : r.summary.actual
  const hm = HEALTH_META[health]
  const targets = facetTargets(data)

  return (
    <>
      <PageHeader
        title="Weekly Review"
        sub={`${fmtLong(ws)} – ${fmtLong(addDays(ws, 6))} · 7 days • Look back • Plan ahead`}
        right={
          <>
            <span
              className={cx(
                'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold',
                reviewed ? 'bg-ceiling/10 text-ceiling-ink' : 'bg-floor/10 text-floor-ink',
              )}
            >
              {reviewed ? <Check size={15} /> : <ClipboardCheck size={15} />}
              {reviewed ? `Reviewed ${fromKey(toKey(new Date(reviewed))).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'Not reviewed'}
            </span>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-night-line dark:bg-night-card">
              <button
                onClick={() => setWs(addDays(ws, -7))}
                aria-label="Previous week"
                className="flex size-10 items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-100 hover:text-brand dark:hover:bg-night dark:hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="border-x border-slate-200 px-3 text-sm font-semibold text-brand dark:border-night-line dark:text-white">
                {ws === current ? 'This week' : ws === addDays(current, -7) ? 'Last week' : `Week of ${fromKey(ws).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
              </span>
              <button
                onClick={() => setWs(addDays(ws, 7))}
                disabled={ws >= current}
                aria-label="Next week"
                className="flex size-10 items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-100 hover:text-brand disabled:opacity-30 dark:hover:bg-night dark:hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        }
      />

      {r.logged === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck2 size={24} />}
            title="Nothing logged this week yet"
            tip="Pick a day mode on Today and your review fills itself in"
            action={{ label: 'Log today', onClick: () => go('today') }}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Week result</span>
              <span className={cx('mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold', hm.bg, hm.text)}>
                {hm.emoji} {hm.label}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">{r.summary.remaining > 0 ? `${r.summary.remaining} days still open` : 'Week closed'}</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Days</span>
              <div className="flex gap-3 text-2xl font-bold tabular-nums">
                <span className="text-ceiling-ink">{r.summary.ceiling}C</span>
                <span className="text-floor-ink">{r.summary.floor}F</span>
                <span className="text-miss-ink">{r.summary.miss}M</span>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Target {data.settings.targets.ceiling} Ceiling</span>
            </Card>
            <Metric label="Life Score" value={r.life === null ? '—' : `${r.life}`} delta={r.life !== null && r.prevLife !== null ? r.life - r.prevLife : null} fmt={(d) => `${d > 0 ? '+' : ''}${d} pts`} />
            <Metric label="Growth Hours" value={fmtH(r.growth)} delta={r.prevGrowth !== null ? r.growth - r.prevGrowth : null} fmt={(d) => `${d > 0 ? '+' : '−'}${fmtH(Math.abs(d))}`} />
            <Metric label="Avg Energy" value={r.avgEnergy === null ? '—' : r.avgEnergy.toFixed(1)} unit="/5" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* Facet scorecard */}
            <Card>
              <CardTitle title="Area Scorecard" sub="This week vs last week • Weekly target" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      <th className="pb-2 font-semibold">Area</th>
                      <th className="pb-2 text-right font-semibold">This week</th>
                      <th className="pb-2 text-right font-semibold">Last week</th>
                      <th className="pb-2 text-right font-semibold">Change</th>
                      <th className="pb-2 text-right font-semibold">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FACETS.map((f) => {
                      const s = r.facets[f.id]
                      const p = r.prevFacets?.[f.id]
                      const hours = f.metric === 'hours'
                      const val = hours ? fmtH(s.hours) : s.score === null ? '—' : `${s.score}%`
                      const prevVal = !p ? '—' : hours ? fmtH(p.hours) : p.score === null ? '—' : `${p.score}%`
                      const delta = !p ? null : hours ? s.hours - p.hours : s.score !== null && p.score !== null ? s.score - p.score : null
                      const target = hours ? fmtH(targets[f.id]) : '80%'
                      const hit = hours ? s.hours >= targets[f.id] : (s.score ?? 0) >= 80
                      return (
                        <tr key={f.id} className="border-t border-slate-100 dark:border-night-line">
                          <td className="py-2">
                            <span className="inline-flex items-center gap-2 font-medium text-brand dark:text-white">
                              <f.Icon size={15} style={{ color: f.color }} /> {f.label}
                            </span>
                          </td>
                          <td className="py-2 text-right font-semibold tabular-nums text-brand dark:text-white">{val}</td>
                          <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{prevVal}</td>
                          <td className="py-2 text-right">
                            <DeltaText value={delta} fmt={(d) => (hours ? fmtH(Math.abs(d)) : `${Math.abs(d)} pts`)} />
                          </td>
                          <td className="py-2 text-right">
                            <span className={cx('inline-flex items-center gap-1 text-xs font-semibold tabular-nums', hit ? 'text-ceiling-ink' : 'text-slate-600 dark:text-slate-400')}>
                              {hit && <Check size={12} strokeWidth={3} />} {target}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Day by day */}
            <Card>
              <CardTitle
                title="Day by Day"
                sub={[r.best && `Best ${DOW_SHORT[dayIdx(r.best.key, ws)]} ${r.best.pct}%`, r.toughest && `Toughest ${DOW_SHORT[dayIdx(r.toughest.key, ws)]} ${r.toughest.pct}%`].filter(Boolean).join(' • ') || 'Blocks done per day'}
              />
              <ul className="flex flex-col gap-2">
                {r.byDay.map((d, i) => {
                  const m = d.mode ? MODE_META[d.mode] : null
                  return (
                    <li key={d.key} className="flex items-center gap-3">
                      <span className="w-9 text-xs font-semibold text-slate-600 dark:text-slate-400">{DOW_SHORT[i]}</span>
                      <span className={cx('w-16 rounded-lg px-1.5 py-0.5 text-center text-[10px] font-bold uppercase', m ? cx(m.solid, 'text-white') : 'bg-slate-100 text-slate-600 dark:text-slate-400 dark:bg-night')}>
                        {m?.label ?? (d.key > today ? 'Ahead' : 'Not logged')}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
                        {d.pct !== null && <div className={cx('h-full rounded-full', m?.bg ?? 'bg-slate-300')} style={{ width: `${d.pct}%` }} />}
                      </div>
                      <span className="w-20 text-right text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {d.total ? `${d.done}/${d.total}` : '—'}
                        {d.energy ? ` • ⚡${d.energy}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <CardTitle title="Weekly Goals" sub="Goals with a weekly target" />
              {r.goals.length ? (
                <ul className="flex flex-col gap-3">
                  {r.goals.map(({ goal, ev }) => (
                    <GoalRow key={goal.id} goal={goal} ev={ev} />
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={<Target size={22} />} title="No weekly goals yet" tip="Goals turn this review into a scorecard" action={{ label: 'Add a goal', onClick: () => go('goals') }} />
              )}
            </Card>

            <Card>
              <CardTitle title="Highlights" sub="From your daily check-ins" right={<Lightbulb size={18} className="text-amber-600 dark:text-accent" />} />
              <div className="flex flex-col gap-4">
                <TextList title="Wins" tone="text-ceiling-ink" items={r.wins} empty="No wins logged" />
                <TextList title="Lessons" tone="text-brand dark:text-accent" items={r.lessons} empty="No lessons logged" />
                {r.grateful.length > 0 && <TextList title="Grateful for" tone="text-ceiling-ink" items={r.grateful} empty="" />}
                {r.bothers.length > 0 && <TextList title="What bothered me" tone="text-floor-ink" items={r.bothers} empty="" />}
                {r.bottleneck && (
                  <div>
                    <Label className="!text-miss-ink">Bottleneck</Label>
                    <p className="flex items-center gap-2 text-sm text-brand dark:text-white">
                      <AlertTriangle size={14} className="text-miss-ink" /> {r.bottleneck.title} • {r.bottleneck.pct}% done
                    </p>
                  </div>
                )}
                {r.missReasons.length > 0 && (
                  <div>
                    <Label>Miss reasons</Label>
                    <p className="text-sm text-brand dark:text-white">{r.missReasons.join(' • ')}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardTitle title="Habits" sub="Days kept this week" />
              <ul className="flex flex-col gap-2.5">
                {r.habits.map(({ habit, done, of }) => {
                  const pct = of ? Math.round((done / of) * 100) : 0
                  return (
                    <li key={habit.id} className="flex items-center gap-3">
                      <span className="w-24 truncate text-[13px] font-medium text-brand dark:text-white">{habit.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
                        <div className={cx('h-full rounded-full', pct >= 80 ? 'bg-ceiling' : pct >= 50 ? 'bg-floor' : 'bg-miss')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {done}/{of}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ReflectionForm key={`r-${ws}`} ws={ws} />
        <PlanNextWeek key={`p-${ws}`} ws={ws} />
      </div>
    </>
  )
}

const dayIdx = (key: string, ws: string) => Math.round((fromKey(key).getTime() - fromKey(ws).getTime()) / 86_400_000)

function Metric({ label, value, unit, delta, fmt }: { label: string; value: string; unit?: string; delta?: number | null; fmt?: (d: number) => string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-brand dark:text-white">
        {value}
        {unit && <span className="text-sm text-slate-600 dark:text-slate-400">{unit}</span>}
      </span>
      {fmt && <DeltaText value={delta ?? null} fmt={fmt} suffix=" vs last week" />}
    </Card>
  )
}

function DeltaText({ value, fmt, suffix = '' }: { value: number | null; fmt: (d: number) => string; suffix?: string }) {
  if (value === null) return <span className="text-[11px] text-slate-600 dark:text-slate-400">—</span>
  if (Math.abs(value) < 0.05)
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        <Minus size={11} /> Flat{suffix}
      </span>
    )
  const up = value > 0
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums', up ? 'text-ceiling-ink' : 'text-miss-ink')}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmt(value)}
      <span className="font-medium text-slate-600 dark:text-slate-400">{suffix}</span>
    </span>
  )
}

function TextList({ title, tone, items, empty }: { title: string; tone: string; items: { date: string; text: string }[]; empty: string }) {
  return (
    <div>
      <Label className={tone}>{title}</Label>
      {items.length ? (
        <ul className="flex flex-col gap-1">
          {items.map((i) => (
            <li key={i.date} className="flex gap-2 text-sm">
              <span className="w-9 shrink-0 text-[11px] font-semibold leading-5 text-slate-600 dark:text-slate-400">{DOW_SHORT[(fromKey(i.date).getDay() + 6) % 7]}</span>
              <span className="line-clamp-3 whitespace-pre-line leading-relaxed text-brand dark:text-white" title={i.text}>
                {i.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-600 dark:text-slate-400">{empty}</p>
      )}
    </div>
  )
}

const RATINGS = ['Rough', 'Meh', 'Okay', 'Good', 'Great']

function ReflectionForm({ ws }: { ws: string }) {
  const { data, setReview, notify } = useStore()
  const review = data.weeks[ws]?.review ?? {}
  const done = !!review.completedAt
  return (
    <Card>
      <CardTitle title="Reflect" sub="Rate the week • Three short answers" right={<Trophy size={18} className="text-amber-600 dark:text-accent" />} />
      <Label>Week rating</Label>
      <div className="mb-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Week rating">
        {RATINGS.map((label, i) => {
          const v = i + 1
          const active = review.rating === v
          return (
            <button
              key={v}
              role="radio"
              aria-checked={active}
              onClick={() => setReview(ws, { rating: active ? undefined : v })}
              className={cx(
                'flex h-12 flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold',
                active
                  ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-400',
              )}
            >
              <span className="text-base font-bold leading-none">{v}</span>
              <span className="text-[10px]">{label}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-3">
        <Area label="What went well?" value={review.wentWell} onSave={(v) => setReview(ws, { wentWell: v })} placeholder="Wins worth repeating" />
        <Area label="What got in the way?" value={review.blockers} onSave={(v) => setReview(ws, { blockers: v })} placeholder="Blockers • Triggers" />
        <Area label="One change for next week" value={review.change} onSave={(v) => setReview(ws, { change: v })} placeholder="Small, specific, doable" />
      </div>
      <button
        onClick={() => {
          setReview(ws, { completedAt: done ? undefined : Date.now() })
          notify(done ? 'Review reopened' : 'Review complete 🎉')
        }}
        className={cx(
          'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold',
          done ? 'border-2 border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-300' : 'bg-ceiling-solid text-white hover:bg-emerald-600',
        )}
      >
        {done ? 'Reopen review' : (
          <>
            <Check size={18} strokeWidth={3} /> Complete review
          </>
        )}
      </button>
    </Card>
  )
}

function Area({ label, value, onSave, placeholder }: { label: string; value?: string; onSave: (v: string) => void; placeholder: string }) {
  const [text, setText] = useState(value ?? '')
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      <textarea
        value={text}
        rows={2}
        maxLength={240}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() !== (value ?? '') && onSave(text.trim())}
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-brand outline-none placeholder:text-slate-400 focus:border-brand focus:bg-white dark:border-night-line dark:bg-night dark:text-white dark:focus:border-accent"
      />
    </label>
  )
}

function PlanNextWeek({ ws }: { ws: string }) {
  const { data, setPriorities } = useStore()
  const next = addDays(ws, 7)
  const saved = data.weeks[next]?.plan?.priorities ?? []
  const [list, setList] = useState<WeekPriority[]>(saved)
  const save = (l: WeekPriority[]) => {
    setList(l)
    setPriorities(next, l)
  }
  const toggle = (id: FacetId) =>
    list.some((p) => p.facet === id) ? save(list.filter((p) => p.facet !== id)) : list.length < 3 && save([...list, { facet: id, note: '' }])

  return (
    <Card>
      <CardTitle title="Plan Next Week" sub={`Week of ${fmtLong(next)} • Pick up to 3 focus areas`} />
      <div className="flex flex-wrap gap-1.5">
        {FACETS.map((f) => {
          const on = list.some((p) => p.facet === f.id)
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              aria-pressed={on}
              disabled={!on && list.length >= 3}
              className={cx(
                'inline-flex h-9 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-semibold transition-colors disabled:opacity-40',
                on ? 'text-brand dark:text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-300',
              )}
              style={on ? { background: `${f.color}1F`, borderColor: f.color } : undefined}
            >
              <f.Icon size={13} /> {f.label}
            </button>
          )
        })}
      </div>
      {list.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2.5">
          {list.map((p, i) => {
            const f = FACET_BY_ID[p.facet]
            return (
              <li key={p.facet} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${f.color}1A`, color: f.color }}>
                  <f.Icon size={16} />
                </span>
                <input
                  defaultValue={p.note}
                  maxLength={60}
                  placeholder={`${f.label} • one intention`}
                  aria-label={`${f.label} intention`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v !== p.note) save(list.map((x, j) => (j === i ? { ...x, note: v } : x)))
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-brand outline-none focus:border-brand focus:bg-white dark:border-night-line dark:bg-night dark:text-white dark:focus:border-accent"
                />
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Priorities show on Today all next week</p>
      )}
    </Card>
  )
}

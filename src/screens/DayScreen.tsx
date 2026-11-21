import { useEffect, useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Flag } from 'lucide-react'
import { FACET_BY_ID } from '../lib/facets'
import { useDayView, useStore } from '../store/AppStore'
import { addDays, dayTypeOf, fmtTime, fromKey, toKey, weekStartOf } from '../lib/time'
import { summarizeWeek } from '../lib/stats'
import { TEMPLATE_LABELS } from '../data/defaults'
import { WeekBar } from '../components/WeekBar'
import { ModeTiles, MissReason } from '../components/DayControls'
import { CareStrip, EssentialsStrip } from '../components/HabitStrips'
import { CatchUpCard } from '../components/CatchUpCard'
import { Timeline } from '../components/Timeline'
import { DayFacets, NowNext, ReflectionCard } from '../components/DayPanels'
import { Card, Kbd, PageHeader, cx } from '../components/ui'
import type { DayMode } from '../types'

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

export function DayScreen({
  now,
  date,
  setDate,
  reviewDue,
  onOpenReview,
}: {
  now: Date
  date: string
  setDate: (d: string) => void
  reviewDue: string | null
  onOpenReview: (ws: string) => void
}) {
  const { data, setDayMode } = useStore()
  const today = toKey(now)
  const isToday = date === today
  const week = useMemo(() => summarizeWeek(data, weekStartOf(date), today), [data, date, today])
  const { day, blocks, isPreview, template } = useDayView(date)
  const yesterdayFocus = data.days[addDays(today, -1)]?.reflection?.focus
  const priorities = data.weeks[weekStartOf(date)]?.plan?.priorities ?? []

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const modes: Record<string, DayMode> = { c: 'ceiling', f: 'floor', m: 'miss' }
      const k = e.key.toLowerCase()
      if (modes[k]) {
        if (data.days[date]?.mode !== modes[k]) setDayMode(date, modes[k])
      } else if (e.key === 'ArrowLeft') setDate(addDays(date, -1))
      else if (e.key === 'ArrowRight' && date < today) setDate(addDays(date, 1))
      else if (k === 't') setDate(today)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [date, today, data.days, setDayMode, setDate])

  const title = isToday
    ? 'Today'
    : fromKey(date).toLocaleDateString(undefined, { weekday: 'long' })
  const fullDate = fromKey(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            {!isToday && <span className="rounded-full bg-floor/15 px-2 py-0.5 text-xs font-semibold text-floor">Editing past day</span>}
          </span>
        }
        sub={`${fullDate} • ${dayTypeOf(date) === 'weekend' ? 'Weekend' : 'Weekday'}`}
        right={
          <>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-night-line dark:bg-night-card">
              <button
                onClick={() => setDate(addDays(date, -1))}
                aria-label="Previous day"
                title="Previous day (←)"
                className="flex size-10 items-center justify-center rounded-l-xl text-slate-500 hover:bg-slate-100 hover:text-brand dark:hover:bg-night dark:hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setDate(today)}
                disabled={isToday}
                title="Jump to today (T)"
                className="flex h-10 items-center gap-1.5 border-x border-slate-200 px-3 text-sm font-semibold text-brand disabled:text-slate-400 dark:border-night-line dark:text-white dark:disabled:text-slate-500"
              >
                <CalendarDays size={15} /> Today
              </button>
              <button
                onClick={() => setDate(addDays(date, 1))}
                disabled={isToday}
                aria-label="Next day"
                title="Next day (→)"
                className="flex size-10 items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-100 hover:text-brand disabled:opacity-30 dark:hover:bg-night dark:hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-3 font-mono text-sm font-semibold tabular-nums text-white dark:bg-night-card">
              <Clock size={14} className="text-accent" />
              {fmtTime(now)}
            </span>
          </>
        }
      />

      {reviewDue && isToday && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-accent bg-accent/15 px-4 py-3">
          <ClipboardCheck size={20} className="text-brand dark:text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand dark:text-white">Weekly review due</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Week of {fromKey(reviewDue).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • 10 minutes • Plan next week</p>
          </div>
          <button
            onClick={() => onOpenReview(reviewDue)}
            className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-2 dark:bg-accent dark:text-brand"
          >
            Start review
          </button>
        </div>
      )}

      <WeekBar week={week} targets={data.settings.targets} selected={date} onSelect={setDate} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
        {/* Left: decide + habits + reflect */}
        <div className="flex flex-col gap-5">
          {priorities.length > 0 && (
            <Card>
              <div className="mb-2.5 flex items-center gap-2">
                <Flag size={15} className="text-accent" />
                <h2 className="text-[15px] font-semibold text-brand dark:text-white">Week Priorities</h2>
                <span className="text-xs text-slate-400">From your review</span>
              </div>
              <ul className="flex flex-col gap-2">
                {priorities.map((p) => {
                  const f = FACET_BY_ID[p.facet]
                  return (
                    <li key={p.facet} className="flex items-center gap-2.5 text-sm">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${f.color}1A`, color: f.color }}>
                        <f.Icon size={14} />
                      </span>
                      <span className="font-semibold text-brand dark:text-white">{f.label}</span>
                      {p.note && <span className="truncate text-slate-500 dark:text-slate-400">• {p.note}</span>}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-brand dark:text-white">How did {isToday ? 'today' : 'this day'} go?</h2>
              <span className="hidden items-center gap-1 text-[11px] text-slate-400 lg:flex">
                Press <Kbd>C</Kbd> <Kbd>F</Kbd> <Kbd>M</Kbd>
              </span>
            </div>
            <ModeTiles date={date} day={day} />
            <MissReason date={date} day={day} />
          </Card>

          <Card className="flex flex-col gap-4">
            <EssentialsStrip date={date} now={now} live={isToday} />
            <CareStrip date={date} />
          </Card>

          <DayFacets day={day} blocks={blocks} />
          <ReflectionCard key={date} date={date} day={day} />
        </div>

        {/* Right: live focus + timeline */}
        <div className="flex min-w-0 flex-col gap-4">
          {isToday && <NowNext blocks={blocks} now={now} focus={yesterdayFocus} />}
          {isToday && <CatchUpCard key={date} date={date} day={day} blocks={blocks} now={now} />}
          <div>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-[15px] font-semibold text-brand dark:text-white">Timeline</h2>
              <span className={cx('text-xs', isPreview ? 'font-semibold text-floor' : 'text-slate-500 dark:text-slate-400')}>
                {isPreview || !template ? 'Ceiling preview • Pick a mode to lock it' : `${TEMPLATE_LABELS[template]} • ${blocks.length} blocks`}
              </span>
            </div>
            <Timeline key={date} date={date} day={day} blocks={blocks} now={now} live={isToday} />
            <p className="mt-3 px-1 text-center text-[11px] text-slate-400">
              Tick ✓ for done and ✕ for missed • Works on any day mode
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

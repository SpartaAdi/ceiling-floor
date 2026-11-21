import { useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { useDayView, useStore } from '../store/AppStore'
import { dayTypeOf, fmtLong, fmtTime, toKey, weekStartOf } from '../lib/time'
import { summarizeWeek } from '../lib/stats'
import { WeekBudgetCard, WeekStrip } from '../components/WeekHeader'
import { ModeSelector, MissReason } from '../components/DayControls'
import { CareStrip, EssentialsStrip } from '../components/HabitStrips'
import { CatchUpCard } from '../components/CatchUpCard'
import { Timeline } from '../components/Timeline'
import { DaySheet } from '../components/DaySheet'
import { Card } from '../components/ui'
import { TEMPLATE_LABELS } from '../data/defaults'

export function TodayScreen({ now }: { now: Date }) {
  const { data } = useStore()
  const today = toKey(now)
  const week = useMemo(() => summarizeWeek(data, weekStartOf(today), today), [data, today])
  const { day, blocks, isPreview, template } = useDayView(today)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const weekend = dayTypeOf(today) === 'weekend'

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 bg-paper/90 px-4 pb-2 pt-safe backdrop-blur-md dark:bg-night/90">
        <div className="flex items-center justify-between pb-2 pt-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-brand dark:text-white">Today</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {fmtLong(today)} • {weekend ? 'Weekend' : 'Weekday'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-white dark:bg-night-card">
            <Clock size={14} className="text-accent" />
            {fmtTime(now)}
          </span>
        </div>
        <WeekBudgetCard week={week} targets={data.settings.targets} />
        <div className="mt-2">
          <WeekStrip
            week={week}
            selected={today}
            onSelect={(k) =>
              k === today ? window.scrollTo({ top: 0, behavior: 'smooth' }) : setSheetDate(k)
            }
          />
        </div>
      </header>

      <div className="flex flex-col gap-3 pt-2">
        <Card className="p-3">
          <ModeSelector date={today} day={day} />
          <MissReason date={today} day={day} />
        </Card>

        <Card className="flex flex-col gap-3 p-3">
          <EssentialsStrip date={today} now={now} live />
          <CareStrip date={today} />
        </Card>

        <CatchUpCard key={today} date={today} day={day} blocks={blocks} now={now} />

        <div>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[15px] font-semibold text-brand dark:text-white">Timeline</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isPreview || !template ? 'Ceiling preview' : TEMPLATE_LABELS[template]} •{' '}
              {blocks.length} blocks
            </span>
          </div>
          <Timeline key={today} date={today} day={day} blocks={blocks} now={now} live />
        </div>
      </div>

      <DaySheet date={sheetDate} onClose={() => setSheetDate(null)} />
    </>
  )
}

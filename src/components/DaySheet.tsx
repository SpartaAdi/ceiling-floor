import { useDayView } from '../store/AppStore'
import { dayTypeOf, fmtLong } from '../lib/time'
import { ModeSelector, MissReason } from './DayControls'
import { CareStrip, EssentialsStrip } from './HabitStrips'
import { Timeline } from './Timeline'
import { BottomSheet } from './ui'

/** Bottom sheet to inspect / edit any past day. */
export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  return (
    <BottomSheet
      open={!!date}
      onClose={onClose}
      title={date ? fmtLong(date) : ''}
      sub={date ? `${dayTypeOf(date) === 'weekend' ? 'Weekend' : 'Weekday'} • Tap blocks to toggle` : undefined}
    >
      {date && <DayEditor date={date} />}
    </BottomSheet>
  )
}

function DayEditor({ date }: { date: string }) {
  const { day, blocks, isPreview } = useDayView(date)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <ModeSelector date={date} day={day} />
        <MissReason date={date} day={day} />
      </div>
      <EssentialsStrip date={date} now={new Date()} live={false} />
      <CareStrip date={date} />
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isPreview ? 'Ceiling preview • No log yet' : 'Blocks • Snapshot'}
        </p>
        <Timeline date={date} day={day} blocks={blocks} />
      </div>
    </div>
  )
}

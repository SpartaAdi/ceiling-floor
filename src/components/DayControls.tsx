import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { DayLog, DayMode } from '../types'
import { blockScore } from '../lib/stats'
import { useStore } from '../store/AppStore'
import { MODE_META, Segmented, cx } from './ui'

const MODES: { value: DayMode; label: string }[] = [
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'floor', label: 'Floor' },
  { value: 'miss', label: 'Miss' },
]

const REASONS = ['Sick', 'Travel', 'Late night', 'Low energy', 'Work crunch']

export function ModeSelector({ date, day }: { date: string; day?: DayLog }) {
  const { setDayMode, resetDay } = useStore()
  const score = blockScore(day)
  const mode = day?.mode
  return (
    <div>
      <Segmented
        value={mode}
        options={MODES}
        onChange={(m) => m !== mode && setDayMode(date, m)}
        colorFor={(m) => cx(MODE_META[m].bg, 'text-white')}
      />
      <div className="mt-2 flex min-h-6 items-center justify-between gap-2 text-xs">
        {mode ? (
          <span className={cx('font-semibold', MODE_META[mode].text)}>
            {MODE_META[mode].label} day • {score.done}/{score.total} blocks
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">No mode yet • Pick one</span>
        )}
        {mode && (
          <button
            onClick={() => resetDay(date)}
            className="-my-2 inline-flex min-h-11 items-center gap-1 px-1 text-slate-400 hover:text-brand dark:hover:text-white"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>
    </div>
  )
}

export function MissReason({ date, day }: { date: string; day?: DayLog }) {
  const { setMissReason } = useStore()
  const [custom, setCustom] = useState('')
  if (day?.mode !== 'miss') return null
  const current = day.missReason
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reason • optional</p>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setMissReason(date, current === r ? '' : r)}
            className={cx(
              'min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium',
              current === r
                ? 'border-miss bg-miss/10 text-miss'
                : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <form
        className="mt-1.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (custom.trim()) setMissReason(date, custom.trim())
          setCustom('')
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={40}
          placeholder={current && !REASONS.includes(current) ? current : 'Own reason…'}
          className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand dark:border-night-line dark:bg-night"
        />
        <button className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:bg-accent dark:text-brand">
          Save
        </button>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { ArrowDownToLine, ArrowUpToLine, Check, CircleSlash, RotateCcw } from 'lucide-react'
import type { DayLog, DayMode } from '../types'
import { blockScore } from '../lib/stats'
import { templateFor } from '../lib/time'
import { useStore } from '../store/AppStore'
import { Kbd, cx } from './ui'

const TILES: Record<
  DayMode,
  { label: string; sub: string; key: string; Icon: typeof Check; idle: string; active: string }
> = {
  ceiling: {
    label: 'Ceiling',
    sub: 'Full plan',
    key: 'C',
    Icon: ArrowUpToLine,
    idle: 'border-ceiling/40 bg-ceiling/5 text-ceiling hover:border-ceiling hover:bg-ceiling/10',
    active: 'border-ceiling bg-ceiling text-white shadow-lg shadow-ceiling/30',
  },
  floor: {
    label: 'Floor',
    sub: 'Minimum day',
    key: 'F',
    Icon: ArrowDownToLine,
    idle: 'border-floor/40 bg-floor/5 text-floor hover:border-floor hover:bg-floor/10',
    active: 'border-floor bg-floor text-white shadow-lg shadow-floor/30',
  },
  miss: {
    label: 'Miss',
    sub: 'Off-track',
    key: 'M',
    Icon: CircleSlash,
    idle: 'border-miss/40 bg-miss/5 text-miss hover:border-miss hover:bg-miss/10',
    active: 'border-miss bg-miss text-white shadow-lg shadow-miss/30',
  },
}

const REASONS = ['Sick', 'Travel', 'Late night', 'Low energy', 'Work crunch']

export function ModeTiles({ date, day, showKeys = true }: { date: string; day?: DayLog; showKeys?: boolean }) {
  const { data, setDayMode, resetDay } = useStore()
  const score = blockScore(day)
  const mode = day?.mode
  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Day mode">
        {(Object.keys(TILES) as DayMode[]).map((m) => {
          const t = TILES[m]
          const active = mode === m
          const blocks = m === 'miss' ? null : data.templates[templateFor(date, m)].length
          return (
            <button
              key={m}
              role="radio"
              aria-checked={active}
              onClick={() => !active && setDayMode(date, m)}
              className={cx(
                'relative flex min-h-[96px] flex-col items-start justify-between rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98]',
                active ? t.active : t.idle,
              )}
            >
              <div className="flex w-full items-start justify-between">
                <span className={cx('flex size-8 items-center justify-center rounded-lg', active ? 'bg-white/20' : 'bg-white dark:bg-night')}>
                  {active ? <Check size={18} strokeWidth={3} /> : <t.Icon size={18} strokeWidth={2.4} />}
                </span>
                {showKeys && (
                  <Kbd className={active ? 'border-white/40 bg-white/15 text-white' : ''}>{t.key}</Kbd>
                )}
              </div>
              <span>
                <span className="block text-base font-bold leading-tight">{t.label}</span>
                <span className={cx('block text-[11px] font-medium', active ? 'text-white/85' : 'opacity-75')}>
                  {t.sub}
                  {blocks !== null && ` • ${blocks} blocks`}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex min-h-8 items-center justify-between gap-2 text-sm">
        {mode ? (
          <span className={cx('font-semibold', mode === 'ceiling' ? 'text-ceiling' : mode === 'floor' ? 'text-floor' : 'text-miss')}>
            {TILES[mode].label} day • {score.done}/{score.total} blocks done
          </span>
        ) : (
          <span className="font-medium text-slate-500 dark:text-slate-400">No mode yet • Pick how today went</span>
        )}
        {mode && (
          <button
            onClick={() => resetDay(date)}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-night dark:hover:text-white"
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
    <div className="mt-3 rounded-xl bg-miss/5 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-miss/80">Miss reason • optional</p>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setMissReason(date, current === r ? '' : r)}
            className={cx(
              'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
              current === r
                ? 'border-miss bg-miss text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-miss/50 dark:border-night-line dark:bg-night-card dark:text-slate-300',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
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
          className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand dark:border-night-line dark:bg-night dark:focus:border-accent"
        />
        <button className="min-h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:bg-accent dark:text-brand">Save</button>
      </form>
    </div>
  )
}

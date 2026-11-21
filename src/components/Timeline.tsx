import { useEffect, useRef, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import type { Block, BlockStatus, DayLog } from '../types'
import { CATEGORY_META } from '../data/defaults'
import { durationLabel, nowMin, toMin } from '../lib/time'
import { effectiveStatus } from '../lib/stats'
import { useStore } from '../store/AppStore'
import { HabitPill } from './HabitStrips'
import { Time12, cx } from './ui'

function TickButton({ kind, active, onClick, label, disabled }: { kind: 'done' | 'miss'; active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  const done = kind === 'done'
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      title={disabled ? 'Tick blocks on the day' : done ? 'Done' : 'Missed'}
      className={cx(
        'flex size-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-90 disabled:pointer-events-none disabled:opacity-30',
        done
          ? active
            ? 'animate-pop border-ceiling bg-ceiling text-white shadow-md shadow-ceiling/30'
            : 'border-ceiling/30 text-ceiling/60 hover:border-ceiling hover:bg-ceiling/10 hover:text-ceiling'
          : active
            ? 'animate-pop border-miss bg-miss text-white shadow-md shadow-miss/30'
            : 'border-miss/30 text-miss/60 hover:border-miss hover:bg-miss/10 hover:text-miss',
      )}
    >
      {done ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
    </button>
  )
}

function BlockRow({
  block,
  status,
  isNow,
  progress,
  isPast,
  onSet,
  extra,
  readOnly,
}: {
  readOnly?: boolean
  block: Block
  status?: BlockStatus
  isNow: boolean
  progress: number
  isPast: boolean
  onSet: (s: BlockStatus) => void
  extra?: ReactNode
}) {
  const cat = CATEGORY_META[block.category] ?? CATEGORY_META.work
  return (
    <li data-now={isNow || undefined} className="scroll-mt-24">
      <div
        className={cx(
          'relative flex min-h-[68px] items-center gap-3 overflow-hidden rounded-2xl border bg-white px-4 py-2.5 transition-colors dark:bg-night-card',
          isNow
            ? 'border-brand ring-4 ring-brand/10 dark:border-accent dark:ring-accent/15'
            : status === 'missed'
              ? 'border-miss/25'
              : 'border-slate-200/80 dark:border-night-line',
          isPast && !status && !isNow && 'opacity-70',
        )}
      >
        <div className="w-[76px] shrink-0 font-mono">
          <Time12 hhmm={block.start} className="block text-sm font-semibold text-brand dark:text-white" />
          <Time12 hhmm={block.end} end className="block text-xs text-slate-400" />
        </div>
        <span className={cx('h-10 w-1 shrink-0 rounded-full', cat.dot)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cx(
                'truncate text-[15px] font-semibold',
                status === 'missed' ? 'text-slate-400 line-through decoration-miss/60' : 'text-brand dark:text-white',
              )}
            >
              {block.title}
            </h3>
            {isNow && (
              <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wider text-accent dark:bg-accent dark:text-brand">
                NOW
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{block.details}</p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-night dark:text-slate-400">
            {cat.label}
          </span>
          <span className="text-[11px] tabular-nums text-slate-400">{durationLabel(block.start, block.end)}</span>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <TickButton kind="done" disabled={readOnly} active={status === 'completed'} onClick={() => onSet('completed')} label={`${block.title} done`} />
          <TickButton kind="miss" disabled={readOnly} active={status === 'missed'} onClick={() => onSet('missed')} label={`${block.title} missed`} />
        </div>
        {isNow && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-brand/10 dark:bg-accent/10" aria-hidden>
            <span className="block h-full bg-brand dark:bg-accent" style={{ width: `${progress}%` }} />
          </span>
        )}
      </div>
      {extra}
    </li>
  )
}

/**
 * Block list for a day. When `live` (today), the block matching the current
 * time gets a NOW badge + progress bar and is scrolled into view on open.
 */
export function Timeline({ date, day, blocks, now, live, readOnly }: { date: string; day?: DayLog; blocks: Block[]; now?: Date; live?: boolean; readOnly?: boolean }) {
  const { data, setBlockStatus, clearBlockStatus, toggleHabit } = useStore()
  const listRef = useRef<HTMLOListElement>(null)
  const m = now ? nowMin(now) : -1
  const current = live ? blocks.find((b) => m >= toMin(b.start) && m < toMin(b.end, true)) : undefined

  useEffect(() => {
    if (!live) return
    const t = window.setTimeout(() => {
      listRef.current?.querySelector('[data-now]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 250)
    return () => window.clearTimeout(t)
  }, [live, date])

  const eveningOpen = data.habits.filter((h) => h.kind === 'daily' && h.evening && !day?.habits[h.id])

  return (
    <ol ref={listRef} aria-label="Timeline" className="flex flex-col gap-2">
      {blocks.map((b) => {
        const status = day ? effectiveStatus(day, b.id) : undefined
        const isNow = b.id === current?.id
        const start = toMin(b.start)
        const end = toMin(b.end, true)
        const showCare = live && b.category === 'care' && m >= start && eveningOpen.length > 0
        return (
          <BlockRow
            key={b.id}
            block={b}
            readOnly={readOnly}
            status={status}
            isNow={isNow}
            progress={isNow ? Math.round(((m - start) / (end - start)) * 100) : 0}
            isPast={live ? end <= m : false}
            onSet={(s) => {
              // Re-clicking the active state clears it only on days without a mode
              if (status === s && !day?.mode && day?.statuses[b.id]) clearBlockStatus(date, b.id)
              else if (status !== s) setBlockStatus(date, b.id, s)
            }}
            extra={
              showCare && (
                <div role="group" aria-label="Still open habits" className="mx-4 flex flex-wrap items-center gap-2 rounded-b-2xl border border-t-0 border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-night-line dark:bg-night">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-floor">Still open</span>
                  {eveningOpen.map((h) => (
                    <HabitPill key={h.id} label={h.label} done={false} nudge compact onToggle={() => toggleHabit(date, h.id)} />
                  ))}
                </div>
              )
            }
          />
        )
      })}
    </ol>
  )
}

import { useEffect, useRef, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import type { Block, BlockStatus, DayLog } from '../types'
import { CATEGORY_META } from '../data/defaults'
import { durationLabel, nowMin, toMin } from '../lib/time'
import { effectiveStatus } from '../lib/stats'
import { useStore } from '../store/AppStore'
import { HabitPill } from './HabitStrips'
import { cx } from './ui'

function StatusIcon({ status }: { status?: BlockStatus }) {
  return (
    <span
      className={cx(
        'flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all',
        status === 'completed' && 'animate-pop border-ceiling bg-ceiling text-white',
        status === 'missed' && 'animate-pop border-miss bg-miss text-white',
        !status && 'border-slate-300 text-transparent dark:border-night-line',
      )}
      aria-hidden
    >
      {status === 'missed' ? <X size={18} strokeWidth={3} /> : <Check size={18} strokeWidth={3} />}
    </span>
  )
}

function BlockCard({
  block,
  status,
  isNow,
  isPast,
  onToggle,
  extra,
}: {
  block: Block
  status?: BlockStatus
  isNow: boolean
  isPast: boolean
  onToggle: () => void
  extra?: ReactNode
}) {
  const cat = CATEGORY_META[block.category] ?? CATEGORY_META.work
  return (
    <li data-now={isNow || undefined} className="scroll-mt-64 scroll-mb-28">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${block.title}, ${block.start} to ${block.end}, ${status ?? 'not logged'}. Tap to toggle.`}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
        className={cx(
          'group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 transition-all active:scale-[0.99] dark:bg-night-card',
          isNow
            ? 'border-brand shadow-[0_0_0_3px_rgba(10,37,64,0.12)] dark:border-accent dark:shadow-[0_0_0_3px_rgba(249,198,66,0.18)]'
            : 'border-slate-200/80 dark:border-night-line',
          isPast && !status && !isNow && 'opacity-70',
        )}
      >
        <div className="flex w-12 shrink-0 flex-col items-start">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-brand dark:text-white">{block.start}</span>
          <span className="font-mono text-[11px] tabular-nums text-slate-400">{block.end}</span>
        </div>
        <span className={cx('h-9 w-1 shrink-0 rounded-full', cat.dot)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3
              className={cx(
                'truncate text-[15px] font-semibold',
                status === 'missed' ? 'text-slate-400 line-through decoration-miss/60' : 'text-brand dark:text-white',
              )}
            >
              {block.title}
            </h3>
            {isNow && (
              <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent dark:bg-accent dark:text-brand">
                NOW
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {block.details}
            <span className="text-slate-300 dark:text-slate-500"> • {durationLabel(block.start, block.end)}</span>
          </p>
        </div>
        <StatusIcon status={status} />
      </div>
      {extra}
    </li>
  )
}

/**
 * Block list for a day. When `live` is set (today), the block matching
 * the current time gets a NOW badge and is scrolled into view on mount.
 */
export function Timeline({
  date,
  day,
  blocks,
  now,
  live,
}: {
  date: string
  day?: DayLog
  blocks: Block[]
  now?: Date
  live?: boolean
}) {
  const { data, toggleBlock, toggleHabit } = useStore()
  const listRef = useRef<HTMLOListElement>(null)
  const m = now ? nowMin(now) : -1
  const nowId = live ? blocks.find((b) => m >= toMin(b.start) && m < toMin(b.end, true))?.id : undefined

  // Auto-focus the active block once on open
  useEffect(() => {
    if (!live) return
    const t = window.setTimeout(() => {
      listRef.current?.querySelector('[data-now]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 250)
    return () => window.clearTimeout(t)
  }, [live, date])

  const eveningOpen = data.habits.filter((h) => h.kind === 'daily' && h.evening && !day?.habits[h.id])

  return (
    <ol ref={listRef} className="flex flex-col gap-2">
      {blocks.map((b) => {
        const status = day ? effectiveStatus(day, b.id) : undefined
        const isNow = b.id === nowId
        const isPast = live ? toMin(b.end, true) <= m : false
        const showCare = live && b.category === 'care' && m >= toMin(b.start) && eveningOpen.length > 0
        return (
          <BlockCard
            key={b.id}
            block={b}
            status={status}
            isNow={isNow}
            isPast={isPast}
            onToggle={() => toggleBlock(date, b.id)}
            extra={
              showCare && (
                <div className="mx-3 -mt-1 flex gap-1.5 rounded-b-2xl border border-t-0 border-slate-200/80 bg-slate-50 p-2 dark:border-night-line dark:bg-night">
                  {eveningOpen.map((h) => (
                    <HabitPill key={h.id} label={h.label} done={false} nudge onToggle={() => toggleHabit(date, h.id)} />
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

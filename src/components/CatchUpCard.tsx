import { useState } from 'react'
import { Check, History, X } from 'lucide-react'
import type { Block, DayLog } from '../types'
import { nowMin, toMin } from '../lib/time'
import { useStore } from '../store/AppStore'
import { Time12 } from './ui'

const dismissKey = (date: string) => `cfm:catchup-dismissed:${date}`

const readDismissed = (date: string) => {
  try {
    return sessionStorage.getItem(dismissKey(date)) === '1'
  } catch {
    return false
  }
}

/** "Earlier Today" — past, unlogged blocks with 1-tap ✓ / ✕. Only while no Day Mode is set. */
export function CatchUpCard({ date, day, blocks, now }: { date: string; day?: DayLog; blocks: Block[]; now: Date }) {
  const { setBlockStatus } = useStore()
  const [dismissed, setDismissed] = useState(() => readDismissed(date))
  if (dismissed || day?.mode) return null

  const m = nowMin(now)
  const pending = blocks.filter((b) => toMin(b.end, true) <= m && !day?.statuses[b.id])
  if (!pending.length) return null

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(date), '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <section aria-label="Earlier Today" className="animate-fade rounded-2xl border border-accent/60 bg-accent/10 p-3 dark:border-accent/30 dark:bg-accent/5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History size={16} className="text-brand dark:text-accent" />
          <div>
            <h2 className="text-sm font-semibold text-brand dark:text-white">Earlier Today</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{pending.length} unlogged • Tap ✓ or ✕</p>
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => pending.forEach((b) => setBlockStatus(date, b.id, 'completed'))}
            className="min-h-11 rounded-lg px-2 text-xs font-semibold text-ceiling"
          >
            All ✓
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex size-11 items-center justify-center rounded-lg text-slate-400 hover:text-brand dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {pending.map((b) => (
          <li key={b.id} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-1 dark:bg-night-card">
            <Time12 hhmm={b.start} className="w-[68px] font-mono text-xs text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand dark:text-white">{b.title}</span>
            <button
              onClick={() => setBlockStatus(date, b.id, 'completed')}
              aria-label={`${b.title} done`}
              className="flex size-11 items-center justify-center rounded-full text-ceiling hover:bg-ceiling/10"
            >
              <Check size={20} strokeWidth={3} />
            </button>
            <button
              onClick={() => setBlockStatus(date, b.id, 'missed')}
              aria-label={`${b.title} missed`}
              className="flex size-11 items-center justify-center rounded-full text-miss hover:bg-miss/10"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

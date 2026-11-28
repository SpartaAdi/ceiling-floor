import { useEffect, useRef, useState } from 'react'
import { ClipboardList, ListChecks, PenLine, Salad, Sparkles } from 'lucide-react'
import { cx } from './ui'

const ALL = [
  { id: 'mode-card', label: 'Plan', Icon: Sparkles },
  { id: 'timeline-card', label: 'Timeline', Icon: ClipboardList },
  { id: 'habits-card', label: 'Habits', Icon: ListChecks },
  { id: 'diet-card', label: 'Diet', Icon: Salad },
  { id: 'checkin-card', label: 'Check-in', Icon: PenLine },
]

/**
 * Phone-only sticky "jump to" bar for the long Today page. Highlights the
 * section you're in (filled pill + bold label) and glides to a section on tap.
 */
export function SectionNav({ future }: { future: boolean }) {
  const items = ALL.filter((s) => !future || s.id === 'mode-card' || s.id === 'timeline-card')
  const [active, setActive] = useState(items[0].id)
  const rowRef = useRef<HTMLDivElement>(null)
  // Keep the highlighted pill visible in the (scrollable) row
  useEffect(() => {
    const row = rowRef.current
    const btn = row?.querySelector<HTMLElement>(`[data-id="${active}"]`)
    if (row && btn) row.scrollTo({ left: btn.offsetLeft - row.clientWidth / 2 + btn.clientWidth / 2, behavior: 'smooth' })
  }, [active])

  useEffect(() => {
    const els = items.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [future]) // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    setActive(id)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <nav aria-label="Jump to" className="sticky top-[env(safe-area-inset-top)] z-30 -mx-4 mt-3 border-b border-slate-200/70 bg-paper/90 px-4 py-2 backdrop-blur-md lg:hidden dark:border-night-line/70 dark:bg-night/90">
      <div ref={rowRef} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        {items.map(({ id, label, Icon }) => {
          const on = active === id
          return (
            <button
              key={id}
              data-id={id}
              onClick={() => jump(id)}
              aria-current={on ? 'true' : undefined}
              className={cx(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] transition-all duration-200',
                on ? 'bg-brand font-bold text-white shadow-md shadow-brand/20 dark:bg-accent dark:text-brand' : 'font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-night-card',
              )}
            >
              {on && <Icon size={15} strokeWidth={2.6} className="animate-pop" />} {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

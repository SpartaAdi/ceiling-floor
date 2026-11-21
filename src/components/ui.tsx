import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { DayMode } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const MODE_META: Record<DayMode, { label: string; text: string; bg: string; soft: string; ring: string; dot: string }> = {
  ceiling: { label: 'Ceiling', text: 'text-ceiling', bg: 'bg-ceiling', soft: 'bg-ceiling/10', ring: 'ring-ceiling', dot: 'bg-ceiling' },
  floor: { label: 'Floor', text: 'text-floor', bg: 'bg-floor', soft: 'bg-floor/10', ring: 'ring-floor', dot: 'bg-floor' },
  miss: { label: 'Miss', text: 'text-miss', bg: 'bg-miss', soft: 'bg-miss/10', ring: 'ring-miss', dot: 'bg-miss' },
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(10,37,64,0.04)] dark:border-night-line dark:bg-night-card',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function CardTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-brand dark:text-white">{title}</h2>
        {sub && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  colorFor,
}: {
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  colorFor?: (v: T) => string
}) {
  return (
    <div
      role="radiogroup"
      className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-night"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 rounded-lg font-semibold transition-all',
              size === 'md' ? 'min-h-11 text-sm' : 'min-h-9 whitespace-nowrap px-2 text-xs',
              active
                ? cx('shadow-sm', colorFor ? colorFor(o.value) : 'bg-white text-brand dark:bg-brand-2 dark:text-white')
                : 'text-slate-500 hover:text-brand dark:text-slate-400 dark:hover:text-white',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function BottomSheet({
  open,
  onClose,
  title,
  sub,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  sub?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="animate-fade absolute inset-0 bg-brand/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet md:animate-fade relative flex max-h-[88dvh] w-full max-w-[560px] flex-col rounded-t-3xl bg-paper pb-safe shadow-2xl md:rounded-3xl dark:bg-night">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 md:hidden dark:bg-night-line" />
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-brand dark:text-white">{title}</h3>
            {sub && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-night-card"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8 md:left-60" role="status" aria-live="polite">
      <div className="animate-fade rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-accent dark:text-brand">
        {message}
      </div>
    </div>
  )
}

export function StatusDot({ mode, size = 'size-2.5' }: { mode?: DayMode; size?: string }) {
  return <span className={cx('inline-block rounded-full', size, mode ? MODE_META[mode].dot : 'bg-slate-300 dark:bg-night-line')} />
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-1 font-mono text-[10px] font-semibold text-slate-500 dark:border-night-line dark:bg-night dark:text-slate-400',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 pt-safe">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-brand dark:text-white">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  )
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400', className)}>{children}</p>
}

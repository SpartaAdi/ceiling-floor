import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { fmtTime } from '../lib/time'
import { Logo, TABS, ThemeSwitch, type Tab } from './Sidebar'
import { cx } from './ui'

/**
 * Phone header: compact bar with the current page; the full menu expands on
 * tap and collapses again after you pick a page (saves screen space).
 */
export function MobileBar({
  tab,
  onChange,
  now,
  badges = {},
  status,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  now: Date
  badges?: Partial<Record<Tab, string>>
  status?: ReactNode
}) {
  const { data, setTheme } = useStore()
  const [open, setOpen] = useState(false)
  const current = TABS.find((t) => t.id === tab)!
  const anyBadge = Object.values(badges).some(Boolean)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="md:hidden">
      {open && <button aria-label="Close menu" className="animate-fade fixed inset-0 z-30 bg-brand/40" onClick={() => setOpen(false)} />}
      <header className="sticky top-0 z-40 bg-brand pt-safe text-white shadow-md shadow-brand/20">
        <div className="flex h-14 items-center gap-2 px-2">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse menu' : 'Expand menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="relative flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
            {anyBadge && !open && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent ring-2 ring-brand" />}
          </button>
          <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-hidden tabIndex={-1}>
            <span className="scale-90">
              <Logo />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight">{current.label}</span>
              <span className="block truncate text-[11px] text-white/50">{current.sub}</span>
            </span>
            <ChevronDown size={16} className={cx('shrink-0 text-white/50 transition-transform', open && 'rotate-180')} />
          </button>
          <span className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 font-mono text-[13px] font-semibold tabular-nums">{fmtTime(now)}</span>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Main" className="animate-fade border-t border-white/10 px-3 pb-4 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {TABS.map(({ id, label, sub, Icon }) => {
                const active = id === tab
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onChange(id)
                      setOpen(false)
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative flex min-h-14 items-center gap-2.5 rounded-xl px-3 text-left',
                      active ? 'bg-white/15 text-white' : 'bg-white/5 text-white/70 active:bg-white/10',
                    )}
                  >
                    <Icon size={19} className={active ? 'text-accent' : ''} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block truncate text-[10px] text-white/45">{sub}</span>
                    </span>
                    {badges[id] && <span className="absolute right-2 top-2 rounded-full bg-accent px-1.5 text-[9px] font-bold text-brand">{badges[id]}</span>}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-40">
                <ThemeSwitch theme={data.settings.theme} setTheme={setTheme} />
              </div>
              <div className="min-w-0 flex-1 text-right">{status}</div>
            </div>
          </nav>
        )}
      </header>
    </div>
  )
}

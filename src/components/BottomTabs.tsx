import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, Ellipsis } from 'lucide-react'
import type { Theme } from '../types'
import { useStore } from '../store/AppStore'
import { TABS, type Tab } from './Sidebar'
import { BottomSheet, Segmented, cx } from './ui'

const PRIMARY: Tab[] = ['today', 'dashboard', 'goals', 'review']
const IN_MORE: Tab[] = ['routine', 'settings']

/**
 * Hide while YOU scroll down, show on scroll up, near the top, or at the end.
 * Programmatic scrolls (e.g. Today jumping to the current block) never hide it,
 * and it always comes back when the page changes.
 */
function useHideOnScroll(enabled: boolean, resetKey: string) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => setHidden(false), [resetKey])
  useEffect(() => {
    if (!enabled) {
      setHidden(false)
      return
    }
    let last = window.scrollY
    let byUser = false
    let timer: number | undefined
    const mark = () => {
      byUser = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => (byUser = false), 900)
    }
    const onScroll = () => {
      const y = window.scrollY
      if (!byUser) {
        last = y
        return
      }
      const d = y - last
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 8
      if (y < 64 || atEnd) setHidden(false)
      else if (d > 8) setHidden(true)
      else if (d < -8) setHidden(false)
      if (Math.abs(d) > 8) last = y
    }
    const opts = { passive: true } as const
    window.addEventListener('touchmove', mark, opts)
    window.addEventListener('wheel', mark, opts)
    window.addEventListener('keydown', mark)
    window.addEventListener('scroll', onScroll, opts)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('touchmove', mark)
      window.removeEventListener('wheel', mark)
      window.removeEventListener('keydown', mark)
      window.removeEventListener('scroll', onScroll)
    }
  }, [enabled])
  return hidden
}

function TabButton({
  label,
  Icon,
  active,
  badge,
  onClick,
  popup,
}: {
  label: string
  Icon: typeof Ellipsis
  active: boolean
  badge?: string
  onClick: () => void
  popup?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active && !popup ? 'page' : undefined}
      aria-haspopup={popup ? 'dialog' : undefined}
      aria-label={badge ? `${label} • ${badge}` : label}
      className={cx(
        'flex min-h-14 flex-col items-center justify-center gap-0.5 transition-colors',
        active ? 'text-brand dark:text-accent' : 'text-slate-600 dark:text-slate-400',
      )}
    >
      <span
        className={cx(
          'relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-out',
          active ? 'scale-100 bg-brand/10 dark:bg-accent/15' : 'scale-90 bg-transparent',
        )}
      >
        <Icon size={24} strokeWidth={active ? 2.4 : 1.9} />
        {badge && <span className="absolute right-2.5 top-0.5 size-2.5 rounded-full bg-miss-solid ring-2 ring-white dark:ring-night-card" aria-hidden />}
      </span>
      <span className={cx('whitespace-nowrap text-[11px] leading-none', active ? 'font-bold' : 'font-medium')}>{label}</span>
    </button>
  )
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/** Phone navigation: 4 primary tabs + More (Routine, Settings, theme). */
export function BottomTabs({
  tab,
  onChange,
  badges = {},
  status,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  badges?: Partial<Record<Tab, string>>
  status?: ReactNode
}) {
  const { data, setTheme } = useStore()
  const [moreOpen, setMoreOpen] = useState(false)
  const hidden = useHideOnScroll(!moreOpen, tab)
  const byId = Object.fromEntries(TABS.map((t) => [t.id, t])) as Record<Tab, (typeof TABS)[number]>

  return (
    <>
      <nav
        aria-label="Main"
        className={cx(
          'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none md:hidden dark:border-night-line dark:bg-night-card/95',
          hidden && 'translate-y-full',
        )}
      >
        <div className="grid grid-cols-5 px-1">
          {PRIMARY.map((id) => (
            <TabButton key={id} label={byId[id].label} Icon={byId[id].Icon} active={tab === id} badge={badges[id]} onClick={() => onChange(id)} />
          ))}
          <TabButton label="More" Icon={Ellipsis} active={IN_MORE.includes(tab)} onClick={() => setMoreOpen(true)} popup />
        </div>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More" sub="Routine • Settings • Theme">
        <div className="flex flex-col gap-2">
          {IN_MORE.map((id) => {
            const t = byId[id]
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => {
                  onChange(id)
                  setMoreOpen(false)
                }}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left transition-colors',
                  active
                    ? 'border-brand/30 bg-brand/5 dark:border-accent/40 dark:bg-accent/10'
                    : 'border-slate-200 bg-white dark:border-night-line dark:bg-night-card',
                )}
              >
                <t.Icon size={22} className={active ? 'text-brand dark:text-accent' : 'text-slate-600 dark:text-slate-400'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-brand dark:text-white">{t.label}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">{t.sub}</span>
                </span>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            )
          })}
          <div className="mt-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Theme</p>
            <Segmented<Theme> value={data.settings.theme} onChange={setTheme} options={THEME_OPTIONS} />
          </div>
          {status && <div className="mt-2 flex justify-center">{status}</div>}
        </div>
      </BottomSheet>
    </>
  )
}

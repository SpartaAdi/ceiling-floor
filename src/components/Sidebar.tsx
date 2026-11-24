import { useState, type ReactNode } from 'react'
import { CalendarCheck, ClipboardCheck, Keyboard, LayoutDashboard, ListTodo, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, Target } from 'lucide-react'
import type { Theme } from '../types'
import { useStore } from '../store/AppStore'
import { cx } from './ui'

export type Tab = 'today' | 'dashboard' | 'goals' | 'review' | 'routine' | 'settings'

export const TABS: { id: Tab; label: string; sub: string; key: string; Icon: typeof CalendarCheck }[] = [
  { id: 'today', label: 'Today', sub: 'Plan • Log', key: '1', Icon: CalendarCheck },
  { id: 'dashboard', label: 'Dashboard', sub: 'Progress • Insights', key: '2', Icon: LayoutDashboard },
  { id: 'goals', label: 'Goals', sub: 'Targets per area', key: '3', Icon: Target },
  { id: 'review', label: 'Review', sub: 'Weekly reflection', key: '4', Icon: ClipboardCheck },
  { id: 'routine', label: 'Routine', sub: 'Templates • Habits', key: '5', Icon: ListTodo },
  { id: 'settings', label: 'Settings', sub: 'Targets • Backup', key: '6', Icon: Settings },
]

export function Logo() {
  return (
    <svg viewBox="0 0 100 100" className="size-9 shrink-0" aria-hidden>
      <rect width="100" height="100" rx="22" fill="#1A3A5C" />
      <rect x="20" y="28" width="60" height="12" rx="6" fill="#10B981" />
      <rect x="20" y="44" width="44" height="12" rx="6" fill="#F59E0B" />
      <rect x="20" y="60" width="24" height="12" rx="6" fill="#F43F5E" />
      <circle cx="74" cy="66" r="6.5" fill="#F9C642" />
    </svg>
  )
}

const THEMES: { value: Theme; Icon: typeof Sun; label: string }[] = [
  { value: 'light', Icon: Sun, label: 'Light' },
  { value: 'dark', Icon: Moon, label: 'Dark' },
  { value: 'system', Icon: Monitor, label: 'System' },
]

const COLLAPSE_KEY = 'cfm:sidebar-collapsed'
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export function Sidebar({
  tab,
  onChange,
  onShortcuts,
  badges = {},
  status,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  onShortcuts: () => void
  badges?: Partial<Record<Tab, string>>
  /** Small status line at the bottom, e.g. sync state */
  status?: ReactNode
}) {
  const { data, setTheme } = useStore()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })
  return (
    <aside
      aria-label="Sidebar"
      className={cx(
        'sticky top-0 hidden h-dvh shrink-0 flex-col bg-brand py-5 text-white transition-[width] duration-200 md:flex',
        collapsed ? 'w-[76px] px-2' : 'w-60 px-3',
      )}
    >
      <div className={cx('mb-8 flex items-center gap-2.5', collapsed ? 'flex-col px-0' : 'px-2')}>
        <Logo />
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[15px] font-bold">Ceiling • Floor</p>
            <p className="text-[11px] text-white/60">Daily system</p>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {TABS.map(({ id, label, sub, key, Icon }) => {
          const active = id === tab
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? `${label} (${key})` : undefined}
              className={cx(
                'group relative flex min-h-12 items-center rounded-xl text-left transition-colors',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
              )}
            >
              {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-accent" />}
              <Icon size={19} className={active ? 'text-accent' : ''} />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block truncate text-[11px] text-white/60">{sub}</span>
                </span>
              )}
              {badges[id] ? (
                collapsed ? (
                  <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent" aria-label={badges[id]} />
                ) : (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-brand">{badges[id]}</span>
                )
              ) : (
                !collapsed && <span className="font-mono text-[10px] text-white/50 opacity-0 transition-opacity group-hover:opacity-100">{key}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className={cx('mt-auto flex flex-col gap-3', collapsed ? 'items-center' : 'px-1')}>
        {status && !collapsed && <div className="px-1">{status}</div>}
        <button
          onClick={onShortcuts}
          aria-label="Shortcuts"
          title="Shortcuts (?)"
          className={cx(
            'flex min-h-11 items-center gap-2 rounded-xl text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white',
            collapsed ? 'w-10 justify-center' : 'px-2',
          )}
        >
          <Keyboard size={16} />
          {!collapsed && (
            <>
              Shortcuts
              <span className="ml-auto rounded border border-white/20 px-1.5 font-mono text-[10px]">?</span>
            </>
          )}
        </button>
        <ThemeSwitch theme={data.settings.theme} setTheme={setTheme} vertical={collapsed} />
        {!collapsed && <p className="px-1 text-[10px] text-white/50">Local-first • Works offline</p>}
      </div>
    </aside>
  )
}

export function ThemeSwitch({ theme, setTheme, vertical = false }: { theme: Theme; setTheme: (t: Theme) => void; vertical?: boolean }) {
  return (
    <div className={cx('flex gap-1 rounded-xl bg-white/5 p-1', vertical && 'flex-col')} role="radiogroup" aria-label="Theme">
      {THEMES.map(({ value, Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cx(
            'flex h-9 items-center justify-center rounded-xl transition-colors',
            vertical ? 'w-10' : 'flex-1',
            theme === value ? 'bg-white/15 text-accent' : 'text-white/50 hover:text-white',
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}

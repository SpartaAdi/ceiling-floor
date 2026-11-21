import { CalendarCheck, Keyboard, LayoutDashboard, ListTodo, Monitor, Moon, Settings, Sun } from 'lucide-react'
import type { Theme } from '../types'
import { useStore } from '../store/AppStore'
import { cx } from './ui'

export type Tab = 'today' | 'dashboard' | 'routine' | 'settings'

export const TABS: { id: Tab; label: string; sub: string; key: string; Icon: typeof CalendarCheck }[] = [
  { id: 'today', label: 'Today', sub: 'Plan • Log', key: '1', Icon: CalendarCheck },
  { id: 'dashboard', label: 'Dashboard', sub: 'Progress • Insights', key: '2', Icon: LayoutDashboard },
  { id: 'routine', label: 'Routine', sub: 'Templates • Habits', key: '3', Icon: ListTodo },
  { id: 'settings', label: 'Settings', sub: 'Targets • Backup', key: '4', Icon: Settings },
]

function Logo() {
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

export function Sidebar({ tab, onChange, onShortcuts }: { tab: Tab; onChange: (t: Tab) => void; onShortcuts: () => void }) {
  const { data, setTheme } = useStore()
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-brand px-3 py-5 text-white md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <Logo />
        <div className="leading-tight">
          <p className="text-[15px] font-bold">Ceiling • Floor</p>
          <p className="text-[11px] text-white/50">Daily system</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {TABS.map(({ id, label, sub, key, Icon }) => {
          const active = id === tab
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'group relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-left transition-colors',
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
              )}
            >
              {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-accent" />}
              <Icon size={19} className={active ? 'text-accent' : ''} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-[11px] text-white/40">{sub}</span>
              </span>
              <span className="font-mono text-[10px] text-white/30 opacity-0 transition-opacity group-hover:opacity-100">{key}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-1">
        <button
          onClick={onShortcuts}
          className="flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
        >
          <Keyboard size={16} /> Shortcuts
          <span className="ml-auto rounded border border-white/20 px-1.5 font-mono text-[10px]">?</span>
        </button>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label="Theme">
          {THEMES.map(({ value, Icon, label }) => (
            <button
              key={value}
              role="radio"
              aria-checked={data.settings.theme === value}
              aria-label={label}
              title={label}
              onClick={() => setTheme(value)}
              className={cx(
                'flex h-9 flex-1 items-center justify-center rounded-lg transition-colors',
                data.settings.theme === value ? 'bg-white/15 text-accent' : 'text-white/50 hover:text-white',
              )}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <p className="px-1 text-[10px] text-white/30">Local-first • Stored on this Mac</p>
      </div>
    </aside>
  )
}

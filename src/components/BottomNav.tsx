import { TABS, type Tab } from './Sidebar'
import { cx } from './ui'

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden border-slate-200/80 bg-white/95 pb-safe backdrop-blur-md dark:border-night-line dark:bg-night-card/95"
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                active ? 'text-brand dark:text-accent' : 'text-slate-400 hover:text-brand dark:hover:text-white',
              )}
            >
              <span className={cx('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-accent/30 dark:bg-accent/10')}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

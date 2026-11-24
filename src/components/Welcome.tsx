import { Check, ChevronRight, Sparkles, X } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { useNav } from '../nav'
import { cx } from './ui'

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

/**
 * First-run checklist (toolkit 3.1 goal gradient + 4.4 lifecycle). Every step
 * reflects something real; "App ready" is genuinely done, so progress starts at 1/5.
 */
export function Welcome({ today }: { today: string }) {
  const { data, setOnboardingDone } = useStore()
  const { go } = useNav()
  const logged = Object.values(data.days).filter((d) => d.mode).length
  if (data.settings.onboardingDone || logged >= 3) return null

  const day = data.days[today]
  const steps = [
    { label: 'App ready', sub: 'Your Ceiling & Floor plans are loaded', done: true, go: () => {} },
    { label: "Pick today's mode", sub: 'Ceiling, Floor or Miss • Ticks your blocks', done: !!day?.mode, go: () => scrollTo('mode-card') },
    { label: 'Tick your habits', sub: 'Meds • Triphala • Eat Right…', done: !!day && Object.values(day.habits).some(Boolean), go: () => scrollTo('habits-card') },
    { label: 'Write a check-in', sub: 'One positive thing about today', done: Object.values(data.days).some((d) => Object.values(d.reflection ?? {}).some(Boolean)), go: () => scrollTo('checkin-card') },
    { label: 'Set your first goal', sub: 'e.g. Deep work 20h a week', done: data.goals.length > 0, go: () => go('goals') },
  ]
  const done = steps.filter((s) => s.done).length
  const pct = Math.round((done / steps.length) * 100)

  return (
    <section aria-label="Get started" className="animate-fade mb-4 rounded-2xl border border-brand/15 bg-white p-4 dark:border-night-line dark:bg-night-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/25 text-brand dark:text-accent">
          <Sparkles size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-brand dark:text-white">{done === steps.length ? "You're all set 🎉" : 'Get started'}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {done}/{steps.length} done • About 2 minutes
          </p>
        </div>
        <button
          onClick={() => setOnboardingDone(true)}
          aria-label="Hide get started"
          className="flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-night"
        >
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-night" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
        <div className="h-full rounded-full bg-ceiling transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((s) => (
          <li key={s.label}>
            <button
              onClick={s.go}
              disabled={s.done}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                s.done ? 'cursor-default' : 'hover:bg-slate-50 dark:hover:bg-night',
              )}
            >
              <span
                className={cx(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  s.done ? 'border-ceiling-solid bg-ceiling-solid text-white' : 'border-slate-300 dark:border-night-line',
                )}
              >
                {s.done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-sm font-semibold', s.done ? 'text-slate-600 line-through decoration-slate-300 dark:text-slate-400' : 'text-brand dark:text-white')}>{s.label}</span>
                <span className="block truncate text-[11px] text-slate-600 dark:text-slate-400">{s.sub}</span>
              </span>
              {!s.done && <ChevronRight size={16} className="shrink-0 text-slate-400" />}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

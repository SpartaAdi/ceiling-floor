import { useMemo, useState, type ReactNode } from 'react'
import { Archive, ArchiveRestore, Check, ChevronDown, Minus, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import type { FacetId, Goal, GoalKind, GoalPeriod } from '../types'
import { useStore } from '../store/AppStore'
import { FACETS, FACET_BY_ID } from '../lib/facets'
import { GOAL_KIND_META, GOAL_PERIOD_LABEL, evaluateGoal, goalHistory } from '../lib/goals'
import { addDays, fmtLong, toKey } from '../lib/time'
import { BottomSheet, Card, PageHeader, cx } from '../components/ui'
import { GoalBar, GoalStatusPill } from '../components/GoalBits'

const uid = () => `goal-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const TEMPLATES: Omit<Goal, 'id' | 'createdAt'>[] = [
  { facet: 'deep', title: 'Deep work 20h', kind: 'hours', target: 20, period: 'week' },
  { facet: 'fitness', title: 'Gym 5x', kind: 'sessions', target: 5, period: 'week' },
  { facet: 'learning', title: 'Finish 2 books', kind: 'manual', target: 2, period: 'month' },
  { facet: 'nutrition', title: 'Eat right 6 days', kind: 'habit', habitId: 'eatright', target: 6, period: 'week' },
  { facet: 'mind', title: 'Meditate 24 days', kind: 'sessions', target: 24, period: 'month' },
  { facet: 'sleep', title: 'Lights out on time 5x', kind: 'sessions', target: 5, period: 'week' },
]

export function GoalsScreen({ now }: { now: Date }) {
  const { data, upsertGoal, notify } = useStore()
  const today = toKey(now)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<FacetId | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)

  const active = data.goals.filter((g) => !g.archived)
  const archived = data.goals.filter((g) => g.archived)
  const evals = useMemo(() => new Map(data.goals.map((g) => [g.id, evaluateGoal(data, g, today)])), [data, today])
  const shown = active.filter((g) => filter === 'all' || g.facet === filter)
  const count = (st: string[]) => active.filter((g) => st.includes(evals.get(g.id)!.status)).length

  const create = (t: Omit<Goal, 'id' | 'createdAt'>) => {
    const habitOk = t.kind !== 'habit' || data.habits.some((h) => h.id === t.habitId)
    if (!habitOk) return setEditing({ ...t, habitId: undefined, id: uid(), createdAt: today })
    upsertGoal({ ...t, id: uid(), createdAt: today })
    notify('Goal added')
  }

  return (
    <>
      <PageHeader
        title="Goals"
        sub="Targets per life area • Auto-tracked from your ✓ ticks"
        right={
          <button
            onClick={() => setEditing({ id: uid(), facet: 'deep', title: '', kind: 'hours', target: 10, period: 'week', createdAt: today })}
            className="hidden h-11 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-2 md:inline-flex dark:bg-accent dark:text-brand"
          >
            <Plus size={16} /> New goal
          </button>
        }
      />

      {active.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Active" value={active.length} />
          <Stat label="Done" value={count(['done'])} tone="text-ceiling-ink" />
          <Stat label="On track" value={count(['on-track'])} tone="text-ceiling-ink" />
          <Stat label="Need attention" value={count(['behind', 'off-track'])} tone="text-miss-ink" />
        </div>
      )}

      {active.length > 0 && (
        <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by area">
          {[{ id: 'all' as const, label: 'All areas' }, ...FACETS.filter((f) => active.some((g) => g.facet === f.id))].map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                'h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                filter === f.id
                  ? 'bg-brand text-white dark:bg-accent dark:text-brand'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-brand dark:bg-night-card dark:text-slate-300 dark:ring-night-line',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {active.length === 0 ? (
        <Card className="py-10 text-center">
          <Target size={32} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-lg font-bold text-brand dark:text-white">No goals yet</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Pick a starter • Edit it anytime</p>
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const f = FACET_BY_ID[t.facet]
              return (
                <button
                  key={t.title}
                  onClick={() => create(t)}
                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 px-3 py-2.5 text-left hover:border-brand dark:border-night-line dark:hover:border-accent"
                >
                  <f.Icon size={18} style={{ color: f.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-brand dark:text-white">{t.title}</span>
                    <span className="block text-[11px] text-slate-600 dark:text-slate-400">
                      {f.label} • {GOAL_PERIOD_LABEL[t.period]}
                    </span>
                  </span>
                  <Plus size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
              )
            })}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((g) => (
            <GoalCard key={g.id} goal={g} today={today} onEdit={() => setEditing(g)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex h-9 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-brand dark:hover:text-white"
          >
            Archived • {archived.length}
            <ChevronDown size={14} className={cx('transition-transform', showArchived && 'rotate-180')} />
          </button>
          {showArchived && (
            <div className="mt-3 grid grid-cols-1 gap-4 opacity-80 lg:grid-cols-2 2xl:grid-cols-3">
              {archived.map((g) => (
                <GoalCard key={g.id} goal={g} today={today} onEdit={() => setEditing(g)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phone: primary action in the thumb zone, above the tab bar */}
      <button
        onClick={() => setEditing({ id: uid(), facet: 'deep', title: '', kind: 'hours', target: 10, period: 'week', createdAt: today })}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/30 md:hidden dark:bg-accent dark:text-brand"
      >
        <Plus size={20} /> New goal
      </button>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && data.goals.some((g) => g.id === editing.id) ? 'Edit goal' : 'New goal'}
        sub="Short title • Measurable target"
      >
        {editing && <GoalForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
      </BottomSheet>
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="py-3">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</p>
      <p className={cx('text-2xl font-bold tabular-nums', tone ?? 'text-brand dark:text-white')}>{value}</p>
    </Card>
  )
}

function GoalCard({ goal, today, onEdit }: { goal: Goal; today: string; onEdit: () => void }) {
  const { data, bumpGoal, setGoalArchived, deleteGoal } = useStore()
  const [armed, setArmed] = useState(false)
  const f = FACET_BY_ID[goal.facet]
  const ev = evaluateGoal(data, goal, today)
  const hist = goalHistory(data, goal, today)
  const unit = GOAL_KIND_META[goal.kind].unit
  const habit = goal.kind === 'habit' ? data.habits.find((h) => h.id === goal.habitId) : undefined

  const footnote =
    ev.status === 'done'
      ? 'Target hit • Nice work'
      : ev.status === 'upcoming'
        ? `Starts ${fmtLong(ev.range.from)}`
        : ev.status === 'missed'
          ? `Ended ${fmtLong(ev.range.to)}`
          : `${ev.daysLeft} day${ev.daysLeft === 1 ? '' : 's'} left • Need ${unit(Math.ceil(ev.needPerDay * 10) / 10)}/day`

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${f.color}1A`, color: f.color }}>
          <f.Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-brand dark:text-white">{goal.title}</h3>
          <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
            {f.label} • {GOAL_PERIOD_LABEL[goal.period]}
            {goal.period === 'custom' && ` • by ${fmtLong(ev.range.to)}`} • {GOAL_KIND_META[goal.kind].label}
            {habit && ` • ${habit.label}`}
          </p>
        </div>
        <GoalStatusPill status={ev.status} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <p>
          <span className="text-3xl font-bold tabular-nums text-brand dark:text-white">{unit(ev.value)}</span>
          <span className="text-sm text-slate-600 dark:text-slate-400"> / {unit(goal.target)}</span>
        </p>
        <span className="text-sm font-bold tabular-nums text-slate-600 dark:text-slate-400">{ev.pct}%</span>
      </div>
      <GoalBar ev={ev} color={f.color} />
      <p className="text-xs text-slate-600 dark:text-slate-400">{footnote}</p>

      {hist.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
          <span>Past {goal.period === 'week' ? 'weeks' : 'months'}</span>
          <span className="flex gap-1">
            {hist.map((h) => (
              <span
                key={h.key}
                title={`${fmtLong(h.key)} • ${unit(h.value)}`}
                className={cx('flex size-5 items-center justify-center rounded-lg', h.hit ? 'bg-ceiling-solid text-white' : 'bg-miss/15 text-miss-ink')}
              >
                {h.hit ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
            ))}
          </span>
          <span className="font-semibold">
            Hit {hist.filter((h) => h.hit).length}/{hist.length}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-night-line">
        {goal.kind === 'manual' && !goal.archived && (
          <div className="mr-auto flex items-center gap-1">
            <IconBtn label={`Decrease ${goal.title}`} onClick={() => bumpGoal(goal.id, today, -1)} disabled={ev.value <= 0}>
              <Minus size={16} />
            </IconBtn>
            <IconBtn label={`Increase ${goal.title}`} onClick={() => bumpGoal(goal.id, today, 1)} strong>
              <Plus size={16} />
            </IconBtn>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label={`Edit ${goal.title}`} onClick={onEdit}>
            <Pencil size={15} />
          </IconBtn>
          <IconBtn label={goal.archived ? `Restore ${goal.title}` : `Archive ${goal.title}`} onClick={() => setGoalArchived(goal.id, !goal.archived)}>
            {goal.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </IconBtn>
          <IconBtn
            label={armed ? `Confirm delete ${goal.title}` : `Delete ${goal.title}`}
            danger={armed}
            onClick={() => {
              if (armed) deleteGoal(goal.id)
              else {
                setArmed(true)
                window.setTimeout(() => setArmed(false), 2500)
              }
            }}
          >
            <Trash2 size={15} />
          </IconBtn>
        </div>
      </div>
    </Card>
  )
}

function IconBtn({
  label,
  onClick,
  children,
  disabled,
  strong,
  danger,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  strong?: boolean
  danger?: boolean
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex size-9 items-center justify-center rounded-xl transition-colors disabled:opacity-30',
        danger
          ? 'bg-miss-solid text-white'
          : strong
            ? 'bg-brand text-white hover:bg-brand-2 dark:bg-accent dark:text-brand'
            : 'text-slate-600 hover:bg-slate-100 hover:text-brand dark:hover:bg-night dark:hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white dark:focus:border-accent'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; sub?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            'rounded-xl border-2 px-2.5 py-2 text-left transition-colors',
            value === o.value
              ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
              : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-300',
          )}
        >
          <span className="block text-sm font-semibold">{o.label}</span>
          {o.sub && <span className="block text-[10px] opacity-75">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function GoalForm({ initial, onDone }: { initial: Goal; onDone: () => void }) {
  const { data, upsertGoal, notify } = useStore()
  const [g, setG] = useState<Goal>(initial)
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setG((p) => ({ ...p, [k]: v }))
  const dailyHabits = data.habits.filter((h) => h.kind === 'daily')
  const errors: string[] = []
  if (!g.title.trim()) errors.push('Add a title')
  if (!(g.target > 0)) errors.push('Target must be above 0')
  if (g.kind === 'habit' && !dailyHabits.some((h) => h.id === g.habitId)) errors.push('Pick a habit')
  if (g.period === 'custom' && g.end && g.start && g.end < g.start) errors.push('End must be after start')

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (errors.length) return
        const out: Goal = { ...g, title: g.title.trim() }
        if (out.kind !== 'habit') delete out.habitId
        if (out.period !== 'custom') {
          delete out.start
          delete out.end
        } else {
          out.start ??= out.createdAt
          out.end ??= addDays(out.start, 29)
        }
        upsertGoal(out)
        notify('Goal saved')
        onDone()
      }}
    >
      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Area</span>
        <div className="flex flex-wrap gap-1.5">
          {FACETS.map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => set('facet', f.id)}
              aria-pressed={g.facet === f.id}
              className={cx(
                'inline-flex h-9 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-semibold',
                g.facet === f.id ? 'text-brand dark:text-white' : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300',
              )}
              style={g.facet === f.id ? { background: `${f.color}1F`, borderColor: f.color } : undefined}
            >
              <f.Icon size={13} /> {f.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Title • 2–5 words">
        <input value={g.title} maxLength={32} onChange={(e) => set('title', e.target.value)} placeholder="Deep work 20h" className={inputCls} />
      </Field>

      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">How it's measured</span>
        <Choice<GoalKind>
          value={g.kind}
          onChange={(v) => {
            set('kind', v)
            // Smart default: pre-pick the habit that feeds this goal's area
            if (v === 'habit' && !g.habitId) set('habitId', (dailyHabits.find((h) => h.facet === g.facet) ?? dailyHabits[0])?.id)
          }}
          options={(Object.keys(GOAL_KIND_META) as GoalKind[]).map((k) => ({ value: k, label: GOAL_KIND_META[k].label, sub: GOAL_KIND_META[k].sub }))}
        />
      </div>

      {g.kind === 'habit' && (
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Habit</span>
          <div role="radiogroup" aria-label="Habit" className="flex flex-wrap gap-1.5">
            {dailyHabits.map((h) => {
              const on = g.habitId === h.id
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  key={h.id}
                  onClick={() => set('habitId', h.id)}
                  className={cx(
                    'inline-flex h-11 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-semibold transition-colors',
                    on
                      ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-300',
                  )}
                >
                  {h.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
        <Field label={`Target • ${GOAL_KIND_META[g.kind].label}`}>
          <input
            type="number"
            min={g.kind === 'hours' ? 0.5 : 1}
            step={g.kind === 'hours' ? 0.5 : 1}
            value={Number.isFinite(g.target) ? g.target : ''}
            onChange={(e) => set('target', e.target.valueAsNumber)}
            className={inputCls}
          />
        </Field>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Period</span>
          <Choice<GoalPeriod>
            value={g.period}
            onChange={(v) => set('period', v)}
            options={(Object.keys(GOAL_PERIOD_LABEL) as GoalPeriod[]).map((p) => ({ value: p, label: GOAL_PERIOD_LABEL[p] }))}
          />
        </div>
      </div>

      {g.period === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <input type="date" value={g.start ?? g.createdAt} onChange={(e) => set('start', e.target.value || undefined)} className={inputCls} />
          </Field>
          <Field label="Deadline">
            <input type="date" value={g.end ?? addDays(g.start ?? g.createdAt, 29)} onChange={(e) => set('end', e.target.value || undefined)} className={inputCls} />
          </Field>
        </div>
      )}

      {errors.length > 0 && g.title && <p className="text-xs font-medium text-miss-ink">{errors.join(' • ')}</p>}

      <button
        disabled={errors.length > 0}
        className="h-12 rounded-2xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand"
      >
        Save goal
      </button>
    </form>
  )
}

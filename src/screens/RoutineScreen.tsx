import { useState, type ReactNode } from 'react'
import { Moon, Pencil, Plus, RotateCcw, Trash2, Clock } from 'lucide-react'
import type { Block, Category, Habit, HabitKind, TemplateKey } from '../types'
import { useStore } from '../store/AppStore'
import { CATEGORIES, CATEGORY_META, TEMPLATE_LABELS } from '../data/defaults'
import { durationLabel, toMin } from '../lib/time'
import { BottomSheet, Card, cx } from '../components/ui'

type RTab = TemplateKey | 'habits'
const TABS: { id: RTab; label: string }[] = [
  { id: 'weekday-ceiling', label: 'Weekday Ceiling' },
  { id: 'weekday-floor', label: 'Weekday Floor' },
  { id: 'weekend-ceiling', label: 'Weekend Ceiling' },
  { id: 'weekend-floor', label: 'Weekend Floor' },
  { id: 'habits', label: 'Habits' },
]

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function useConfirm() {
  const [armed, setArmed] = useState<string | null>(null)
  const arm = (id: string, action: () => void) => {
    if (armed === id) {
      action()
      setArmed(null)
    } else {
      setArmed(id)
      window.setTimeout(() => setArmed((a) => (a === id ? null : a)), 2500)
    }
  }
  return { armed, arm }
}

export function RoutineScreen() {
  const [tab, setTab] = useState<RTab>('weekday-ceiling')
  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 bg-paper/90 px-4 pb-3 pt-safe backdrop-blur-md dark:bg-night/90">
        <div className="pb-2 pt-3">
          <h1 className="text-xl font-bold tracking-tight text-brand dark:text-white">Routine</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Edit templates • Past days keep snapshots</p>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'min-h-10 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                tab === t.id
                  ? 'bg-brand text-white dark:bg-accent dark:text-brand'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-night-card dark:text-slate-300 dark:ring-night-line',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div className="pt-1">{tab === 'habits' ? <HabitsEditor /> : <TemplateEditor tk={tab} />}</div>
    </>
  )
}

/* ---------- Templates ---------- */

const emptyBlock = (): Block => ({ id: uid('blk'), start: '07:00', end: '08:00', title: '', details: '', category: 'deep' })

function TemplateEditor({ tk }: { tk: TemplateKey }) {
  const { data, deleteBlock, resetTemplate, notify } = useStore()
  const [editing, setEditing] = useState<Block | null>(null)
  const { armed, arm } = useConfirm()
  const blocks = data.templates[tk]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {TEMPLATE_LABELS[tk]} • {blocks.length} blocks
        </span>
        <button
          onClick={() =>
            arm('reset', () => {
              resetTemplate(tk)
              notify('Template reset')
            })
          }
          className={cx(
            'inline-flex min-h-11 items-center gap-1 px-1 text-xs font-semibold',
            armed === 'reset' ? 'text-miss' : 'text-slate-400 hover:text-brand dark:hover:text-white',
          )}
        >
          <RotateCcw size={12} /> {armed === 'reset' ? 'Tap to confirm' : 'Reset'}
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {blocks.map((b) => (
          <li key={b.id}>
            <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 dark:border-night-line dark:bg-night-card">
              <div className="w-12 shrink-0 font-mono tabular-nums">
                <div className="text-[13px] font-semibold text-brand dark:text-white">{b.start}</div>
                <div className="text-[11px] text-slate-400">{b.end}</div>
              </div>
              <span className={cx('h-9 w-1 shrink-0 rounded-full', CATEGORY_META[b.category]?.dot)} />
              <button onClick={() => setEditing(b)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-[15px] font-semibold text-brand dark:text-white">{b.title}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {b.details} • {durationLabel(b.start, b.end)}
                </div>
              </button>
              <button
                onClick={() => setEditing(b)}
                aria-label={`Edit ${b.title}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-night"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => arm(b.id, () => deleteBlock(tk, b.id))}
                aria-label={armed === b.id ? `Confirm delete ${b.title}` : `Delete ${b.title}`}
                className={cx(
                  'flex size-11 shrink-0 items-center justify-center rounded-full',
                  armed === b.id ? 'bg-miss text-white' : 'text-slate-400 hover:bg-miss/10 hover:text-miss',
                )}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setEditing(emptyBlock())}
        className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-brand hover:text-brand dark:border-night-line dark:text-slate-300 dark:hover:border-accent dark:hover:text-accent"
      >
        <Plus size={18} /> Add block
      </button>
      <BlockForm tk={tk} block={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

const inputCls =
  'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white dark:focus:border-accent'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function BlockForm({ tk, block, onClose }: { tk: TemplateKey; block: Block | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!block} onClose={onClose} title={block?.title ? 'Edit block' : 'New block'} sub={TEMPLATE_LABELS[tk]}>
      {block && <BlockFormBody key={block.id} tk={tk} initial={block} onDone={onClose} />}
    </BottomSheet>
  )
}

function BlockFormBody({ tk, initial, onDone }: { tk: TemplateKey; initial: Block; onDone: () => void }) {
  const { upsertBlock, notify } = useStore()
  const [b, setB] = useState<Block>(initial)
  const set = <K extends keyof Block>(k: K, v: Block[K]) => setB((p) => ({ ...p, [k]: v }))
  const timeOk = toMin(b.end, true) > toMin(b.start)
  const valid = b.title.trim().length > 0 && timeOk

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        upsertBlock(tk, { ...b, title: b.title.trim(), details: b.details.trim() })
        notify('Block saved')
        onDone()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <input type="time" required value={b.start} onChange={(e) => set('start', e.target.value)} className={inputCls} />
        </Field>
        <Field label="End">
          <input type="time" required value={b.end} onChange={(e) => set('end', e.target.value)} className={inputCls} />
        </Field>
      </div>
      {!timeOk && <p className="-mt-1 text-xs text-miss">End must be after start</p>}
      <Field label="Title • 2–4 words">
        <input
          value={b.title}
          maxLength={24}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Deep Block"
          className={inputCls}
        />
      </Field>
      <Field label="Details • use dots">
        <input
          value={b.details}
          maxLength={60}
          onChange={(e) => set('details', e.target.value)}
          placeholder="Focus • No phone"
          className={inputCls}
        />
      </Field>
      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c: Category) => (
            <button
              type="button"
              key={c}
              onClick={() => set('category', c)}
              aria-pressed={b.category === c}
              className={cx(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                b.category === c
                  ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
                  : 'border-slate-200 text-slate-600 dark:border-night-line dark:text-slate-300',
              )}
            >
              <span className={cx('size-2 rounded-full', CATEGORY_META[c].dot)} />
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </div>
      <button
        disabled={!valid}
        className="mt-2 min-h-12 rounded-2xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand"
      >
        Save block
      </button>
    </form>
  )
}

/* ---------- Habits ---------- */

function HabitsEditor() {
  const { data, deleteHabit, resetHabits, notify } = useStore()
  const [editing, setEditing] = useState<Habit | null>(null)
  const { armed, arm } = useConfirm()
  const groups: { kind: HabitKind; title: string; sub: string }[] = [
    { kind: 'daily', title: 'Daily Essentials', sub: 'Every day • Today strip' },
    { kind: 'weekly', title: 'Weekend Care', sub: '1x per week • Sat & Sun' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <Card key={g.kind} className="p-3">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-brand dark:text-white">{g.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{g.sub}</p>
            </div>
            <button
              onClick={() => setEditing({ id: uid('hab'), label: '', kind: g.kind })}
              aria-label={`Add ${g.title} habit`}
              className="-mr-1 -mt-1 flex size-11 items-center justify-center rounded-full text-brand hover:bg-slate-100 dark:text-accent dark:hover:bg-night"
            >
              <Plus size={20} />
            </button>
          </div>
          <ul className="flex flex-col">
            {data.habits
              .filter((h) => h.kind === g.kind)
              .map((h) => (
                <li key={h.id} className="flex min-h-12 items-center gap-2 border-t border-slate-100 first:border-t-0 dark:border-night-line">
                  <button onClick={() => setEditing(h)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="truncate text-sm font-semibold text-brand dark:text-white">{h.label}</span>
                    {h.evening && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-night dark:text-slate-400">
                        <Moon size={10} /> Night
                      </span>
                    )}
                    {h.nudgeAfter && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-floor/10 px-1.5 py-0.5 text-[10px] text-floor">
                        <Clock size={10} /> {h.nudgeAfter}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => arm(h.id, () => deleteHabit(h.id))}
                    aria-label={armed === h.id ? `Confirm delete ${h.label}` : `Delete ${h.label}`}
                    className={cx(
                      'flex size-11 items-center justify-center rounded-full',
                      armed === h.id ? 'bg-miss text-white' : 'text-slate-400 hover:text-miss',
                    )}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      ))}
      <button
        onClick={() =>
          arm('reset-habits', () => {
            resetHabits()
            notify('Habits reset')
          })
        }
        className={cx(
          'inline-flex min-h-11 items-center justify-center gap-1 text-xs font-semibold',
          armed === 'reset-habits' ? 'text-miss' : 'text-slate-400',
        )}
      >
        <RotateCcw size={12} /> {armed === 'reset-habits' ? 'Tap to confirm' : 'Reset habits'}
      </button>
      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing?.label ? 'Edit habit' : 'New habit'}>
        {editing && <HabitForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
      </BottomSheet>
    </div>
  )
}

function HabitForm({ initial, onDone }: { initial: Habit; onDone: () => void }) {
  const { upsertHabit, notify } = useStore()
  const [h, setH] = useState<Habit>(initial)
  const valid = h.label.trim().length > 0
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        const out: Habit = { ...h, label: h.label.trim() }
        if (out.kind === 'weekly') {
          delete out.evening
          delete out.nudgeAfter
        }
        if (!out.nudgeAfter) delete out.nudgeAfter
        upsertHabit(out)
        notify('Habit saved')
        onDone()
      }}
    >
      <Field label="Label • 1–2 words">
        <input value={h.label} maxLength={16} onChange={(e) => setH({ ...h, label: e.target.value })} placeholder="Water" className={inputCls} />
      </Field>
      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Frequency</span>
        <div className="flex gap-2">
          {(['daily', 'weekly'] as HabitKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setH({ ...h, kind: k })}
              aria-pressed={h.kind === k}
              className={cx(
                'min-h-11 flex-1 rounded-xl border text-sm font-semibold',
                h.kind === k
                  ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
                  : 'border-slate-200 text-slate-500 dark:border-night-line dark:text-slate-300',
              )}
            >
              {k === 'daily' ? 'Daily' : '1x / Week'}
            </button>
          ))}
        </div>
      </div>
      {h.kind === 'daily' && (
        <>
          <label className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 dark:border-night-line dark:bg-night-card">
            <span className="text-sm font-medium text-brand dark:text-white">Night Care pill • after 21:00</span>
            <input
              type="checkbox"
              checked={!!h.evening}
              onChange={(e) => setH({ ...h, evening: e.target.checked })}
              className="size-5 accent-[#0A2540] dark:accent-[#F9C642]"
            />
          </label>
          <Field label="Nudge after • optional">
            <input type="time" value={h.nudgeAfter ?? ''} onChange={(e) => setH({ ...h, nudgeAfter: e.target.value || undefined })} className={inputCls} />
          </Field>
        </>
      )}
      <button
        disabled={!valid}
        className="mt-2 min-h-12 rounded-2xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand"
      >
        Save habit
      </button>
    </form>
  )
}

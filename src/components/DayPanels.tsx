import { useState } from 'react'
import { ArrowRight, CloudRain, Crosshair, Heart, HelpCircle, Lightbulb, Moon, Pencil, Sparkles, Sun } from 'lucide-react'
import type { Block, DayLog, FacetId, Reflection } from '../types'
import { HOUR_FACETS, blockMinutes, facetOfCategory, fmtH } from '../lib/facets'
import { effectiveStatus } from '../lib/stats'
import { fmt12, fmtLong, nowMin, toMin } from '../lib/time'
import { useStore } from '../store/AppStore'
import { BottomSheet, Card, Kbd, Label, cx } from './ui'

const fmtDur = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

/** Live "what now / what next" focal card (today only). */
export function NowNext({ blocks, now, focus }: { blocks: Block[]; now: Date; focus?: string }) {
  const m = nowMin(now)
  const cur = blocks.find((b) => m >= toMin(b.start) && m < toMin(b.end, true))
  const next = blocks.find((b) => toMin(b.start) > m)
  return (
    <section aria-label="Now and next" className="overflow-hidden rounded-2xl bg-brand text-white shadow-lg shadow-brand/20 dark:bg-brand-2">
      {focus && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2 text-xs">
          <Crosshair size={14} className="shrink-0 text-accent" />
          <span className="font-semibold text-white/60">Today's focus</span>
          <span className="truncate font-semibold">{focus}</span>
        </div>
      )}
      <div className="p-4">
        {cur ? (
          <>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wider text-brand">NOW</span>
              <span className="font-mono text-xs text-white/60">
                {fmt12(cur.start)} – {fmt12(cur.end, true)}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold">{cur.title}</h2>
            <p className="text-sm text-white/60">{cur.details}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${((m - toMin(cur.start)) / (toMin(cur.end, true) - toMin(cur.start))) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-accent">{fmtDur(toMin(cur.end, true) - m)} left</p>
          </>
        ) : next ? (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Between blocks</span>
            <h2 className="mt-1 text-xl font-bold">Day starts soon</h2>
          </>
        ) : (
          <>
            <Moon size={20} className="text-accent" />
            <h2 className="mt-1 text-xl font-bold">Day complete</h2>
            <p className="text-sm text-white/60">Log blocks • Reflect • Rest</p>
          </>
        )}
        {next && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <ArrowRight size={14} className="text-white/50" />
            <span className="text-white/60">Next</span>
            <span className="truncate font-semibold">{next.title}</span>
            <span className="ml-auto shrink-0 text-xs text-accent">in {fmtDur(toMin(next.start) - m)}</span>
          </div>
        )}
      </div>
    </section>
  )
}

/** Hours invested per life facet for one day: done vs planned. */
export function DayFacets({ day, blocks, future = false }: { day?: DayLog; blocks: Block[]; future?: boolean }) {
  const planned: Partial<Record<FacetId, number>> = {}
  const done: Partial<Record<FacetId, number>> = {}
  for (const b of blocks) {
    const f = facetOfCategory(b.category)
    if (!f) continue
    const mins = blockMinutes(b)
    planned[f] = (planned[f] ?? 0) + mins
    if (day && effectiveStatus(day, b.id) === 'completed') done[f] = (done[f] ?? 0) + mins
  }
  const rows = HOUR_FACETS.filter((f) => planned[f.id])
  const growthDone = rows.filter((f) => f.growth).reduce((a, f) => a + (done[f.id] ?? 0), 0) / 60
  const growthPlan = rows.filter((f) => f.growth).reduce((a, f) => a + (planned[f.id] ?? 0), 0) / 60
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-brand dark:text-white">{future ? 'Planned Time' : 'Time Invested'}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">{future ? 'What this plan gives each area' : 'Done vs planned • This day'}</p>
        </div>
        <p className="text-right">
          <span className="text-xl font-bold tabular-nums text-brand dark:text-white">{fmtH(future ? growthPlan : growthDone)}</span>
          <span className="text-xs text-slate-600 dark:text-slate-400">{future ? ' growth planned' : ` / ${fmtH(growthPlan)} growth`}</span>
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((f) => {
          const p = planned[f.id] ?? 0
          const d = done[f.id] ?? 0
          return (
            <li key={f.id} className="flex items-center gap-3">
              <f.Icon size={15} style={{ color: f.color }} className="shrink-0" />
              <span className="w-24 shrink-0 truncate text-[13px] font-medium text-brand dark:text-white">{f.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-night">
                <div className="h-full rounded-full transition-all" style={{ width: `${((future ? p : d) / p) * 100}%`, background: f.color, opacity: future ? 0.45 : 1 }} />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-600 dark:text-slate-400">
                {future ? fmtH(p / 60) : `${fmtH(d / 60)} / ${fmtH(p / 60)}`}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const ENERGY = ['Drained', 'Low', 'Okay', 'Good', 'Great']

export const PROMPTS: { key: keyof Reflection; title: string; sub: string; placeholder: string; Icon: typeof Sparkles }[] = [
  { key: 'win', title: 'Something positive today', sub: 'A win • A good moment', placeholder: 'What went well today, big or small…', Icon: Sun },
  { key: 'grateful', title: "I'm grateful for", sub: 'People • Things • Moments', placeholder: 'Today I am grateful for…', Icon: Heart },
  { key: 'lesson', title: 'Lesson to keep', sub: 'Something I learned today', placeholder: 'What I learned today and want to remember…', Icon: Lightbulb },
  { key: 'bother', title: 'Something bothering me', sub: 'Name it • Let it out', placeholder: "What's been on my mind…", Icon: CloudRain },
  { key: 'why', title: 'Why it bothers me', sub: 'The reason underneath', placeholder: 'It bothers me because…', Icon: HelpCircle },
  { key: 'focus', title: 'Focus for tomorrow', sub: 'The one thing that matters', placeholder: 'Tomorrow, the one thing I will do is…', Icon: Crosshair },
]

/** Energy check-in + reflection prompts; each prompt opens a full writing dialog. */
export function ReflectionCard({ date, day }: { date: string; day?: DayLog }) {
  const { setEnergy } = useStore()
  const [open, setOpen] = useState<keyof Reflection | null>(null)
  const r: Reflection = day?.reflection ?? {}
  const done = PROMPTS.filter((p) => r[p.key]).length
  const prompt = PROMPTS.find((p) => p.key === open)
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-amber-600 dark:text-accent" />
        <h2 className="text-[15px] font-semibold text-brand dark:text-white">Check-in</h2>
        <span className="text-xs text-slate-600 dark:text-slate-400">Energy • Reflect • Plan</span>
        <span className={cx('ml-auto text-xs font-bold tabular-nums', done === PROMPTS.length ? 'text-ceiling-ink' : 'text-slate-600 dark:text-slate-400')}>
          {done}/{PROMPTS.length}
        </span>
      </div>
      <Label>Energy</Label>
      <div className="mb-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Energy">
        {ENERGY.map((label, i) => {
          const v = i + 1
          const active = day?.energy === v
          return (
            <button
              key={v}
              role="radio"
              aria-checked={active}
              onClick={() => setEnergy(date, active ? undefined : v)}
              className={cx(
                'flex min-h-12 flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold transition-colors',
                active
                  ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-400',
              )}
            >
              <span className="text-base font-bold leading-none">{v}</span>
              <span className="mt-0.5 text-[10px]">{label}</span>
            </button>
          )
        })}
      </div>
      <ul className="flex flex-col gap-2" aria-label="Reflection prompts">
        {PROMPTS.map((p) => {
          const text = r[p.key]
          return (
            <li key={p.key}>
              <button
                onClick={() => setOpen(p.key)}
                aria-label={`${p.title}${text ? ' • written' : ''}`}
                className={cx(
                  'flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors',
                  text
                    ? 'border-slate-200 bg-white hover:border-brand dark:border-night-line dark:bg-night dark:hover:border-accent'
                    : 'border-dashed border-slate-200 hover:border-brand hover:bg-slate-50 dark:border-night-line dark:hover:border-accent dark:hover:bg-night',
                )}
              >
                <span
                  className={cx(
                    'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
                    text ? 'bg-ceiling/10 text-ceiling-ink' : 'bg-slate-100 text-slate-600 dark:text-slate-400 dark:bg-night',
                  )}
                >
                  <p.Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand dark:text-white">{p.title}</span>
                  {text ? (
                    <span className="line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-300">{text.replace(/\n\s*\n+/g, '\n')}</span>
                  ) : (
                    <span className="block text-xs text-slate-600 dark:text-slate-400">{p.sub} • Click to write</span>
                  )}
                </span>
                <Pencil size={14} className="mt-1 shrink-0 text-slate-300" />
              </button>
            </li>
          )
        })}
      </ul>
      {prompt && <WriteDialog key={`${date}-${prompt.key}`} date={date} prompt={prompt} initial={r[prompt.key] ?? ''} onClose={() => setOpen(null)} />}
    </Card>
  )
}

const MAX_NOTE = 5000

/** Full-size notepad for one reflection prompt. ⌘/Ctrl + Enter saves; Esc cancels. */
function WriteDialog({
  date,
  prompt,
  initial,
  onClose,
}: {
  date: string
  prompt: (typeof PROMPTS)[number]
  initial: string
  onClose: () => void
}) {
  const { setReflection, notify } = useStore()
  const [text, setText] = useState(initial)
  const changed = text.trim() !== initial.trim()
  const save = () => {
    setReflection(date, prompt.key, text)
    notify(text.trim() ? 'Saved' : 'Cleared')
    onClose()
  }
  return (
    <BottomSheet open onClose={onClose} title={prompt.title} sub={`${prompt.sub} • ${fmtLong(date)}`} wide>
      <textarea
        autoFocus
        value={text}
        maxLength={MAX_NOTE}
        placeholder={prompt.placeholder}
        aria-label={prompt.title}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            save()
          }
        }}
        className="min-h-[300px] w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-[15px] leading-relaxed text-brand outline-none placeholder:text-slate-400 focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white dark:focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {text.length.toLocaleString()}/{MAX_NOTE.toLocaleString()} • <Kbd>⌘</Kbd> <Kbd>Enter</Kbd> to save
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:border-slate-400 dark:border-night-line dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!changed}
            className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-2 disabled:opacity-40 dark:bg-accent dark:text-brand"
          >
            Save
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

const SHORTCUTS: [string[], string][] = [
  [['C'], 'Ceiling day'],
  [['F'], 'Floor day'],
  [['M'], 'Miss day'],
  [['←', '→'], 'Previous • Next day'],
  [['T'], 'Jump to today'],
  [['1', '2', '3'], 'Today • Dashboard • Goals'],
  [['4', '5', '6'], 'Review • Routine • Settings'],
  [['?'], 'Show shortcuts'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Keyboard shortcuts" sub="Day keys work on the Today page">
      <ul className="flex flex-col divide-y divide-slate-200 dark:divide-night-line">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-brand dark:text-white">{label}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}

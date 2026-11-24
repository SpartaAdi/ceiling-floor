import { useRef, useState, type ReactNode } from 'react'
import { Database, Download, FlaskConical, Minus, Monitor, Moon, Plus, Sun, Trash2, Upload } from 'lucide-react'
import type { AppData, Targets, Theme } from '../types'
import { useStore } from '../store/AppStore'
import { exportJSON, importJSON } from '../services/storageService'
import { Card, CardTitle, PageHeader, Segmented, cx } from '../components/ui'
import { HOUR_FACETS, autoFacetTargets, fmtH } from '../lib/facets'
import { SyncCard } from '../components/SyncCard'

function Stepper({
  label,
  sub,
  value,
  onChange,
  tone,
}: {
  label: string
  sub: string
  value: number
  onChange: (n: number) => void
  tone: string
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={cx('text-sm font-semibold', tone)}>{label}</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">{sub}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-night">
        <button
          aria-label={`Decrease ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
          className="flex size-10 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white"
        >
          <Minus size={16} />
        </button>
        <span className="w-8 text-center text-lg font-bold tabular-nums text-brand dark:text-white">{value}</span>
        <button
          aria-label={`Increase ${label}`}
          disabled={value >= 7}
          onClick={() => onChange(value + 1)}
          className="flex size-10 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  sub,
  onClick,
  danger,
}: {
  icon: ReactNode
  label: string
  sub: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
        danger ? 'bg-miss/10 text-miss-ink hover:bg-miss/15' : 'bg-slate-50 text-brand hover:bg-slate-100 dark:bg-night dark:text-white dark:hover:bg-night-line',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={cx('block truncate text-[11px]', danger ? 'text-miss-ink' : 'text-slate-600 dark:text-slate-400')}>{sub}</span>
      </span>
    </button>
  )
}

export function SettingsScreen() {
  const { data, setTargets, setTheme, replaceAll, loadDemo, removeDemo, clearAll, notify } = useStore()
  const t = data.settings.targets
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<AppData | null>(null)
  const [armed, setArmed] = useState<string | null>(null)

  const confirm = (id: string, action: () => void) => {
    if (armed === id) {
      action()
      setArmed(null)
    } else {
      setArmed(id)
      window.setTimeout(() => setArmed((a) => (a === id ? null : a)), 3000)
    }
  }

  const upd = (patch: Partial<Targets>) => setTargets({ ...t, ...patch })
  const hasDemo = Object.values(data.days).some((d) => d.demo)
  const loggedDays = Object.values(data.days).filter((d) => d.mode).length

  return (
    <>
      <PageHeader title="Settings" sub="Budget • Facet targets • Backup • Theme" />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
        <Card>
          <CardTitle title="Weekly Budget" sub={`${t.ceiling + t.floor} planned days • ~${Math.round((t.ceiling / 7) * 100)}% Ceiling`} />
          <div className="divide-y divide-slate-100 dark:divide-night-line">
            <Stepper label="Ceiling target" sub="Days for a Green week" value={t.ceiling} onChange={(n) => upd({ ceiling: n })} tone="text-ceiling-ink" />
            <Stepper label="Floor allowance" sub="Fallback days per week" value={t.floor} onChange={(n) => upd({ floor: n })} tone="text-floor-ink" />
            <Stepper label="Miss allowance" sub="Misses before Amber" value={t.miss} onChange={(n) => upd({ miss: n })} tone="text-miss-ink" />
          </div>
        </Card>

        <FacetTargetsCard />
        </div>

        <div className="flex flex-col gap-5">
        <SyncCard />
        <Card>
          <CardTitle title="Theme" sub="Light • Dark • System" />
          <Segmented<Theme>
            value={data.settings.theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <div className="mt-2 flex justify-around text-slate-600 dark:text-slate-400" aria-hidden>
            <Sun size={14} />
            <Moon size={14} />
            <Monitor size={14} />
          </div>
        </Card>

        <Card>
          <CardTitle title="Backup" sub={`${loggedDays} logged days • Stored on device`} right={<Database size={18} className="text-slate-300" />} />
          <div className="flex flex-col gap-2">
            <ActionButton
              icon={<Download size={18} />}
              label="Export JSON"
              sub="Download full backup"
              onClick={() => {
                exportJSON(data)
                notify('Backup downloaded')
              }}
            />
            <ActionButton icon={<Upload size={18} />} label="Import JSON" sub="Restore from a backup file" onClick={() => fileRef.current?.click()} />
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  setPending(await importJSON(f))
                } catch {
                  notify('Invalid backup file')
                }
              }}
            />
            {pending && (
              <div className="animate-fade rounded-xl border border-floor/40 bg-floor/10 p-3">
                <p className="text-sm font-semibold text-brand dark:text-white">Replace all data?</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {Object.values(pending.days).filter((d) => d.mode).length} logged days in file • Current data overwritten
                </p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setPending(null)} className="min-h-11 flex-1 rounded-xl bg-white text-sm font-semibold text-slate-600 dark:bg-night-card dark:text-slate-300">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      replaceAll(pending)
                      setPending(null)
                      notify('Backup restored')
                    }}
                    className="min-h-11 flex-1 rounded-xl bg-brand text-sm font-semibold text-white dark:bg-accent dark:text-brand"
                  >
                    Replace
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle title="Demo & Data" sub="Test the dashboard instantly" />
          <div className="flex flex-col gap-2">
            {hasDemo ? (
              <ActionButton
                icon={<FlaskConical size={18} />}
                label="Remove Demo Data"
                sub="Deletes demo days only"
                onClick={() => {
                  removeDemo()
                  notify('Demo data removed')
                }}
              />
            ) : (
              <ActionButton
                icon={<FlaskConical size={18} />}
                label="Load 6-Week Demo Data"
                sub="Fills the past 42 days • Overwrites them"
                onClick={() => {
                  loadDemo()
                  notify('6 weeks of demo data loaded')
                }}
              />
            )}
            <ActionButton
              danger
              icon={<Trash2 size={18} />}
              label={armed === 'clear' ? 'Tap again to confirm' : 'Clear All Data'}
              sub="Logs, templates & settings • Synced devices too • Can't undo"
              onClick={() =>
                confirm('clear', () => {
                  clearAll()
                  notify('All data cleared')
                })
              }
            />
          </div>
        </Card>

        </div>
        <p className="pb-2 text-center text-[11px] text-slate-600 dark:text-slate-400">
          Ceiling • Floor • Miss • v1.0 • Local-first
        </p>
      </div>
    </>
  )
}

function FacetTargetsCard() {
  const { data, setFacetTarget } = useStore()
  const auto = autoFacetTargets(data)
  return (
    <Card>
      <CardTitle title="Facet Targets" sub="Weekly hours • Auto = your Green-week plan" />
      <div className="divide-y divide-slate-100 dark:divide-night-line">
        {HOUR_FACETS.map((f) => {
          const custom = data.settings.facetTargets[f.id]
          const value = custom ?? auto[f.id]
          return (
            <div key={f.id} className="flex min-h-14 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${f.color}1A`, color: f.color }}>
                <f.Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand dark:text-white">{f.label}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {custom === undefined ? 'Auto from templates' : (
                    <button onClick={() => setFacetTarget(f.id, undefined)} className="font-semibold text-brand underline dark:text-accent">
                      Reset to auto • {fmtH(auto[f.id])}
                    </button>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-night">
                <button
                  aria-label={`Decrease ${f.label} target`}
                  disabled={value <= 0}
                  onClick={() => setFacetTarget(f.id, value - 1)}
                  className="flex size-9 items-center justify-center rounded-full bg-white text-brand shadow-sm disabled:opacity-30 dark:bg-night-card dark:text-white"
                >
                  <Minus size={15} />
                </button>
                <span className="w-14 text-center text-sm font-bold tabular-nums text-brand dark:text-white">{fmtH(value)}</span>
                <button
                  aria-label={`Increase ${f.label} target`}
                  onClick={() => setFacetTarget(f.id, value + 1)}
                  className="flex size-9 items-center justify-center rounded-full bg-white text-brand shadow-sm dark:bg-night-card dark:text-white"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

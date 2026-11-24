import { useEffect, useState } from 'react'
import { Bell, BellOff, Cloud, CloudOff, LogOut, RefreshCw, Send, Smartphone } from 'lucide-react'
import { useSync, type SyncState } from '../sync/SyncProvider'
import { pushConfigured, SYNC_CONFIG } from '../sync/config'
import { currentPushSubscription, pushBlocker, subscribePush, unsubscribePush } from '../services/push'
import { useStore } from '../store/AppStore'
import { fmt12 } from '../lib/time'
import type { Reminders } from '../types'
import { Card, CardTitle, cx } from './ui'

export const DEFAULT_REMINDERS: Reminders = { morning: '09:30', evening: '21:00' }

const ago = (t: number | null) => {
  if (!t) return ''
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`
}

export function syncLabel(state: SyncState, last: number | null) {
  switch (state) {
    case 'syncing':
      return 'Syncing…'
    case 'synced':
      return `Synced ${ago(last)}`
    case 'offline':
      return 'Offline • Will sync'
    case 'error':
      return 'Sync error'
    case 'signed-out':
      return 'Sync off • Sign in'
    default:
      return 'This device only'
  }
}

/** Compact status for the sidebar / phone menu. */
export function SyncStatus({ dark = true }: { dark?: boolean }) {
  const { state, lastSyncedAt, configured } = useSync()
  if (!configured) return null
  const dot = state === 'synced' ? 'bg-ceiling' : state === 'syncing' ? 'bg-accent animate-pulse' : state === 'error' ? 'bg-miss' : 'bg-slate-400'
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[11px] font-medium', dark ? 'text-white/60' : 'text-slate-500')} role="status">
      <span className={cx('size-2 rounded-full', dot)} />
      {syncLabel(state, lastSyncedAt)}
    </span>
  )
}

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night dark:text-white dark:focus:border-accent'

export function SyncCard() {
  const sync = useSync()
  if (!sync.configured) {
    return (
      <Card>
        <CardTitle title="Sync & Reminders" sub="This device only" right={<CloudOff size={18} className="text-slate-300" />} />
        <p className="text-sm text-slate-600 dark:text-slate-300">Sync isn't set up yet • Data stays on this device</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Follow SETUP-SYNC.md in the project to link your Mac and iPhone and turn on reminders.</p>
      </Card>
    )
  }
  return (
    <Card>
      <CardTitle
        title="Sync & Reminders"
        sub={syncLabel(sync.state, sync.lastSyncedAt)}
        right={<Cloud size={18} className={sync.state === 'synced' ? 'text-ceiling' : 'text-slate-300'} />}
      />
      {sync.user ? <SignedIn /> : <SignInForm />}
    </Card>
  )
}

function SignInForm() {
  const { signIn, signUp } = useSync()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8

  const run = async (kind: 'in' | 'up') => {
    setBusy(true)
    setMsg(null)
    try {
      if (kind === 'in') await signIn(email.trim(), password)
      else {
        const r = await signUp(email.trim(), password)
        setMsg(r.needsConfirmation ? { tone: 'ok', text: 'Check your email to confirm • Then sign in here' } : { tone: 'ok', text: 'Account created • Syncing' })
      }
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) void run('in')
      }}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">Sign in with the same account on your Mac and iPhone</p>
      <input type="email" autoComplete="email" inputMode="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Password • 8+ characters"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputCls}
      />
      {msg && <p className={cx('text-xs font-medium', msg.tone === 'ok' ? 'text-ceiling' : 'text-miss')}>{msg.text}</p>}
      <div className="flex gap-2">
        <button disabled={!valid || busy} className="h-11 flex-1 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand">
          {busy ? 'Working…' : 'Sign in'}
        </button>
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => void run('up')}
          className="h-11 flex-1 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-night-line dark:text-slate-300"
        >
          Create account
        </button>
      </div>
    </form>
  )
}

function SignedIn() {
  const { user, syncNow, signOut, state, error } = useSync()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 basis-full truncate text-sm text-brand sm:flex-1 sm:basis-auto dark:text-white">
          Signed in as <span className="font-semibold">{user?.email}</span>
        </span>
        <button
          onClick={() => void syncNow()}
          disabled={state === 'syncing'}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-night-line dark:text-slate-300"
        >
          <RefreshCw size={13} className={state === 'syncing' ? 'animate-spin' : ''} /> Sync now
        </button>
        <button onClick={() => void signOut()} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:text-miss">
          <LogOut size={13} /> Sign out
        </button>
      </div>
      {error && <p className="text-xs font-medium text-miss">{error}</p>}
      <RemindersSection />
    </div>
  )
}

function RemindersSection() {
  const { data, setReminders, notify } = useStore()
  const { user, cloud } = useSync()
  const reminders = data.settings.reminders ?? DEFAULT_REMINDERS
  const [onHere, setOnHere] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const blocker = pushBlocker()

  useEffect(() => {
    void currentPushSubscription().then((s) => setOnHere(!!s))
  }, [])

  if (!pushConfigured()) {
    return <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-night dark:text-slate-400">Reminders need the VAPID key step in SETUP-SYNC.md</p>
  }

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const turnOn = () =>
    act(async () => {
      const sub = await subscribePush(SYNC_CONFIG.vapidPublicKey)
      await cloud!.savePushSubscription(user!, sub, reminders)
      setOnHere(true)
      notify('Reminders on for this device')
    })
  const turnOff = () =>
    act(async () => {
      const endpoint = await unsubscribePush()
      if (endpoint) await cloud!.deletePushSubscription(endpoint)
      setOnHere(false)
      notify('Reminders off for this device')
    })
  const test = () =>
    act(async () => {
      const r = await cloud!.sendTest()
      setMsg(r.sent ? `Test sent to ${r.sent} device${r.sent === 1 ? '' : 's'}` : 'No devices with reminders on')
    })
  const changeTime = (k: keyof Reminders, v: string) => {
    if (!v) return
    const next = { ...reminders, [k]: v }
    setReminders(next)
    if (user && cloud) void cloud.updateReminderTimes(user, next).catch(() => setMsg('Could not update times • Try again'))
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-night-line">
      <div className="mb-2 flex items-center gap-2">
        <Bell size={15} className="text-accent" />
        <p className="text-sm font-semibold text-brand dark:text-white">Daily reminders</p>
        <span className="text-xs text-slate-400">Twice a day • Not per task</span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Morning • {fmt12(reminders.morning)}</span>
          <input type="time" aria-label="Morning reminder" value={reminders.morning} onChange={(e) => changeTime('morning', e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Evening • {fmt12(reminders.evening)}</span>
          <input type="time" aria-label="Evening reminder" value={reminders.evening} onChange={(e) => changeTime('evening', e.target.value)} className={inputCls} />
        </label>
      </div>

      {blocker === 'needs-home-screen' ? (
        <p className="flex items-start gap-2 rounded-lg bg-accent/15 p-2.5 text-xs text-brand dark:text-white">
          <Smartphone size={15} className="mt-0.5 shrink-0" />
          On iPhone, tap Share → Add to Home Screen, then open the app from your Home Screen to turn reminders on.
        </p>
      ) : blocker === 'unsupported' ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">This browser can't show reminders • Try Safari (iPhone Home Screen) or Chrome (Mac)</p>
      ) : blocker === 'denied' ? (
        <p className="text-xs text-miss">Notifications are blocked for this app • Allow them in system settings</p>
      ) : onHere ? (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ceiling/10 px-3 text-xs font-bold text-ceiling">
            <Bell size={13} /> On for this device
          </span>
          <button onClick={() => void test()} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-night-line dark:text-slate-300">
            <Send size={13} /> Send test
          </button>
          <button onClick={() => void turnOff()} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:text-miss">
            <BellOff size={13} /> Turn off
          </button>
        </div>
      ) : (
        <button
          onClick={() => void turnOn()}
          disabled={busy || onHere === null}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand"
        >
          <Bell size={16} /> Turn on reminders for this device
        </button>
      )}
      {msg && <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">{msg}</p>}
    </div>
  )
}

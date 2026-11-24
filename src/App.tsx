import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from './store/AppStore'
import { useNow } from './hooks/useNow'
import { Sidebar, type Tab } from './components/Sidebar'
import { BottomTabs } from './components/BottomTabs'
import { NavContext } from './nav'
import { SyncStatus } from './components/SyncCard'
import { ShortcutsDialog } from './components/DayPanels'
import { Toast } from './components/ui'
import { DayScreen } from './screens/DayScreen'
import { RoutineScreen } from './screens/RoutineScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { GoalsScreen } from './screens/GoalsScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { toKey } from './lib/time'
import { defaultReviewWeek, reviewDue } from './lib/review'

const DashboardScreen = lazy(() => import('./screens/DashboardScreen').then((m) => ({ default: m.DashboardScreen })))

const TAB_KEY = 'cfm:tab'
const readTab = (): Tab => {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    return t === 'dashboard' || t === 'goals' || t === 'review' || t === 'routine' || t === 'settings' ? t : 'today'
  } catch {
    return 'today'
  }
}

function useTheme() {
  const { data } = useStore()
  const theme = data.settings.theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#06182B' : '#0A2540')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

const TAB_KEYS: Record<string, Tab> = { '1': 'today', '2': 'dashboard', '3': 'goals', '4': 'review', '5': 'routine', '6': 'settings' }

export default function App() {
  const { ready, toast, data, setDayMode, notify } = useStore()
  const now = useNow()
  const today = toKey(now)
  const [tab, setTab] = useState<Tab>(readTab)
  // null = follow "today" (rolls over at midnight)
  const [viewDate, setViewDate] = useState<string | null>(null)
  const [shortcuts, setShortcuts] = useState(false)
  // null = default review week (this week on Sunday, else last week)
  const [reviewWs, setReviewWs] = useState<string | null>(null)
  const due = reviewDue(data, today)
  const badges: Partial<Record<Tab, string>> = due ? { review: 'Due' } : {}
  useTheme()

  const go = useCallback((t: Tab) => {
    setTab(t)
    try {
      sessionStorage.setItem(TAB_KEY, t)
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 })
  }, [])

  const setDate = useCallback((d: string) => setViewDate(d === today ? null : d), [today])

  // A day planned in advance becomes that mode when it arrives
  const todayPlan = data.days[today]?.mode ? undefined : data.days[today]?.plan
  useEffect(() => {
    if (!ready || !todayPlan) return
    setDayMode(today, todayPlan)
    notify(`Today's plan applied • ${todayPlan[0].toUpperCase()}${todayPlan.slice(1)}`)
  }, [ready, today, todayPlan, setDayMode, notify])
  const openDay = useCallback(
    (d: string) => {
      setDate(d)
      go('today')
    },
    [go, setDate],
  )

  const openReview = useCallback(
    (ws: string) => {
      setReviewWs(ws)
      go('review')
    },
    [go],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?') {
        setShortcuts((v) => !v)
        e.preventDefault()
      } else if (TAB_KEYS[e.key]) {
        go(TAB_KEYS[e.key])
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const nav = useMemo(() => ({ go, openDay }), [go, openDay])

  if (!ready) return null

  return (
    <NavContext.Provider value={nav}>
    <div className="flex min-h-dvh">
      <Sidebar tab={tab} onChange={go} onShortcuts={() => setShortcuts(true)} badges={badges} status={<SyncStatus />} />
      <div className="min-w-0 flex-1">
        {/* Phone status-bar band (keeps iOS status text readable) */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-brand md:hidden" />
        <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1rem)] md:px-8 md:pb-12 md:pt-8">
          <div key={tab} className="animate-page mx-auto max-w-[1400px]">
            {tab === 'today' && <DayScreen now={now} date={viewDate ?? today} setDate={setDate} reviewDue={due} onOpenReview={openReview} />}
            {tab === 'dashboard' && (
              <Suspense fallback={<div className="pt-24 text-center text-sm text-slate-600 dark:text-slate-400">Loading…</div>}>
                <DashboardScreen now={now} onOpenDay={openDay} />
              </Suspense>
            )}
            {tab === 'goals' && <GoalsScreen now={now} />}
            {tab === 'review' && <ReviewScreen now={now} ws={reviewWs ?? defaultReviewWeek(today)} setWs={setReviewWs} />}
            {tab === 'routine' && <RoutineScreen />}
            {tab === 'settings' && <SettingsScreen />}
          </div>
        </main>
      </div>
      <BottomTabs tab={tab} onChange={go} badges={badges} status={<SyncStatus dark={false} />} />
      <Toast message={toast} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
    </NavContext.Provider>
  )
}

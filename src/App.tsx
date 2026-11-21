import { Suspense, lazy, useEffect, useState } from 'react'
import { useStore } from './store/AppStore'
import { useNow } from './hooks/useNow'
import { BottomNav, type Tab } from './components/BottomNav'
import { Toast } from './components/ui'
import { TodayScreen } from './screens/TodayScreen'
import { RoutineScreen } from './screens/RoutineScreen'
import { SettingsScreen } from './screens/SettingsScreen'

const DashboardScreen = lazy(() => import('./screens/DashboardScreen').then((m) => ({ default: m.DashboardScreen })))

const TAB_KEY = 'cfm:tab'
const readTab = (): Tab => {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    return t === 'dashboard' || t === 'routine' || t === 'settings' ? t : 'today'
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

export default function App() {
  const { ready, toast } = useStore()
  const now = useNow()
  const [tab, setTab] = useState<Tab>(readTab)
  useTheme()

  const go = (t: Tab) => {
    setTab(t)
    try {
      sessionStorage.setItem(TAB_KEY, t)
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 })
  }

  if (!ready) return null

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] px-4 pb-28">
      <main key={tab}>
        {tab === 'today' && <TodayScreen now={now} />}
        {tab === 'dashboard' && (
          <Suspense fallback={<div className="pt-24 text-center text-sm text-slate-400">Loading…</div>}>
            <DashboardScreen now={now} />
          </Suspense>
        )}
        {tab === 'routine' && <RoutineScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <Toast message={toast} />
      <BottomNav tab={tab} onChange={go} />
    </div>
  )
}

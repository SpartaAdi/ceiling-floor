import { useEffect, useState } from 'react'

/** Device-local clock, refreshed on each minute boundary (every 60s) and on app resume. */
export function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let interval: number | undefined
    const tick = () => setNow(new Date())
    const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50
    const timeout = window.setTimeout(() => {
      tick()
      interval = window.setInterval(tick, 60_000)
    }, msToNextMinute)

    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
    }
  }, [])

  return now
}

import { useEffect } from 'react'

/**
 * Requests a screen wake lock so the iPad doesn't dim while drawing.
 * Re-requests automatically after the tab becomes visible again.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null

    async function request() {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Denied or unsupported — silent fail
      }
    }

    request()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      lock?.release()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}

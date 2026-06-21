import { useEffect } from 'react'
import { useStore } from './store'

// Mount once (in the dashboard shell). Drives the replay engine with the real
// frame delta; the store no-ops when paused. dt is clamped so a backgrounded
// tab or a long stall doesn't fast-forward the whole scenario on resume.
export function useReplayClock() {
  const advance = useStore((s) => s.advance)

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      advance(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [advance])
}

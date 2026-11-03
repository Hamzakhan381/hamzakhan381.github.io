import { useEffect, useRef, useState } from 'react'
import { scrollState } from './scroll'
import { HALF } from './math'

/**
 * Tracks which `[data-focus-item]` inside the returned ref is nearest the middle of the screen
 * while the list spans that middle line, and publishes it to the 3D scene through
 * `scrollState.focus` (-1 when the list is above or below the middle).
 */
export function useFocusIndex<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-focus-item]'))
    let frame = 0

    const update = () => {
      frame = 0
      const mid = window.innerHeight * HALF
      const bounds = root.getBoundingClientRect()
      const index =
        bounds.top < mid && bounds.bottom > mid
          ? items
              .map((item) => {
                const r = item.getBoundingClientRect()
                return Math.abs((r.top + r.bottom) * HALF - mid)
              })
              .reduce((best, distance, i, all) => (distance < all[best] ? i : best), 0)
          : -1
      if (index === scrollState.focus) return
      scrollState.focus = index
      setActive(index)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      scrollState.focus = -1
    }
  }, [])

  return { ref, active }
}

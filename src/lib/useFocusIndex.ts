import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
    // Positions in page coordinates, measured on layout changes only, so scrolling never forces a layout.
    let span = { top: 0, bottom: 0 }
    let centres: number[] = []

    const measure = () => {
      const y = window.scrollY
      const bounds = root.getBoundingClientRect()
      span = { top: bounds.top + y, bottom: bounds.bottom + y }
      centres = items.map((item) => {
        const r = item.getBoundingClientRect()
        return (r.top + r.bottom) * HALF + y
      })
    }

    const update = () => {
      const mid = scrollState.y + window.innerHeight * HALF
      const index =
        span.top < mid && span.bottom > mid
          ? centres.reduce((best, centre, i) => (Math.abs(centre - mid) < Math.abs(centres[best] - mid) ? i : best), 0)
          : -1
      if (index === scrollState.focus) return
      scrollState.focus = index
      setActive(index)
    }

    const remeasure = () => {
      measure()
      update()
    }

    remeasure()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', remeasure)
    ScrollTrigger.addEventListener('refresh', remeasure)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', remeasure)
      ScrollTrigger.removeEventListener('refresh', remeasure)
      scrollState.focus = -1
    }
  }, [])

  return { ref, active }
}

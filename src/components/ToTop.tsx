import { useEffect, useRef } from 'react'
import { scrollState, scrollToTopSmooth } from '../lib/scroll'
import { Icon } from './Icon'
import { HALF, TAU } from '../lib/math'

const RING_RADIUS = 20
const RING_SIZE = 48
const CIRCUMFERENCE = TAU * RING_RADIUS
const SHOW_AFTER_SCREENS = 0.6

/** Floating "back to top" button whose ring fills as you scroll down the page. */
export function ToTop() {
  const button = useRef<HTMLButtonElement>(null)
  const ring = useRef<SVGCircleElement>(null)

  // Updated from scroll events, not every frame: reading scroll position while styles are dirty forces a layout.
  useEffect(() => {
    let lastOffset = -1
    const update = () => {
      const el = button.current
      if (!el) return
      el.classList.toggle('is-visible', window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS)
      const offset = Math.round(CIRCUMFERENCE * (1 - scrollState.progress))
      if (offset === lastOffset) return
      lastOffset = offset
      ring.current?.setAttribute('stroke-dashoffset', String(offset))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const centre = RING_SIZE * HALF
  return (
    <button ref={button} type="button" className="to-top" onClick={scrollToTopSmooth} aria-label="Back to top">
      <svg className="to-top__progress" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
        <circle cx={centre} cy={centre} r={RING_RADIUS} className="to-top__track" />
        <circle
          ref={ring}
          cx={centre}
          cy={centre}
          r={RING_RADIUS}
          className="to-top__ring"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <Icon name="arrowUp" />
    </button>
  )
}

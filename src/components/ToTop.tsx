import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
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

  useEffect(() => {
    const tick = () => {
      const el = button.current
      if (!el) return
      el.classList.toggle('is-visible', window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS)
      ring.current?.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - scrollState.progress)))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
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

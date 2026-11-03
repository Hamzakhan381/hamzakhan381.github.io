import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/quality'

const DOT_DURATION = 0.08
const RING_DURATION = 0.45
const SPOT_DURATION = 1.1
const INTERACTIVE = 'a, button, input, textarea, label, .tilt'
const MAGNETIC = '.btn, .icon-btn, .socials a'
const MAGNET_PX = 7
const HALF = 0.5

/**
 * Dot + trailing ring cursor for fine pointers; the ring swells over interactive elements and buttons lean
 * toward it. A soft spotlight drifts after it underneath the 3D scene, lighting up the dot grid.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const spot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (!dot.current || !ring.current || !spot.current) return
    document.documentElement.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: DOT_DURATION })
    const dy = gsap.quickTo(dot.current, 'y', { duration: DOT_DURATION })
    const rx = gsap.quickTo(ring.current, 'x', { duration: RING_DURATION, ease: 'power3.out' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: RING_DURATION, ease: 'power3.out' })
    const sx = gsap.quickTo(spot.current, 'x', { duration: SPOT_DURATION, ease: 'power2.out' })
    const sy = gsap.quickTo(spot.current, 'y', { duration: SPOT_DURATION, ease: 'power2.out' })
    const ringEl = ring.current
    let magnet: HTMLElement | null = null

    const release = () => {
      magnet?.style.removeProperty('--mag-x')
      magnet?.style.removeProperty('--mag-y')
      magnet = null
    }

    const move = (e: PointerEvent) => {
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
      sx(e.clientX)
      sy(e.clientY)
      const target = e.target instanceof Element ? e.target : null
      ringEl.classList.toggle('is-hover', Boolean(target?.closest(INTERACTIVE)))
      const pull = target?.closest<HTMLElement>(MAGNETIC) ?? null
      if (pull !== magnet) release()
      if (!pull) return
      magnet = pull
      const box = pull.getBoundingClientRect()
      const ox = (e.clientX - box.left - box.width * HALF) / (box.width * HALF)
      const oy = (e.clientY - box.top - box.height * HALF) / (box.height * HALF)
      pull.style.setProperty('--mag-x', `${ox * MAGNET_PX}px`)
      pull.style.setProperty('--mag-y', `${oy * MAGNET_PX}px`)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      release()
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <>
      <div ref={spot} className="cursor-spot" aria-hidden="true" />
      <div ref={ring} className="cursor cursor--ring" aria-hidden="true" />
      <div ref={dot} className="cursor cursor--dot" aria-hidden="true" />
    </>
  )
}

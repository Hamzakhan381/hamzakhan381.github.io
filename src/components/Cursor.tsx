import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const DOT_DURATION = 0.08
const RING_DURATION = 0.45
const INTERACTIVE = 'a, button, input, textarea, label, .tilt'

/** Dot + trailing ring cursor for fine pointers; the ring swells over interactive elements. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (!dot.current || !ring.current) return
    document.documentElement.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: DOT_DURATION })
    const dy = gsap.quickTo(dot.current, 'y', { duration: DOT_DURATION })
    const rx = gsap.quickTo(ring.current, 'x', { duration: RING_DURATION, ease: 'power3.out' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: RING_DURATION, ease: 'power3.out' })
    const ringEl = ring.current

    const move = (e: PointerEvent) => {
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
      const hovering = e.target instanceof Element && e.target.closest(INTERACTIVE)
      ringEl.classList.toggle('is-hover', Boolean(hovering))
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor cursor--ring" aria-hidden="true" />
      <div ref={dot} className="cursor cursor--dot" aria-hidden="true" />
    </>
  )
}

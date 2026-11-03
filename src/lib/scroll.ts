import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DOUBLE, HALF, MS_PER_SECOND, clamp } from './math'

gsap.registerPlugin(ScrollTrigger)

const LENIS_LERP = 0.09
const LENIS_WHEEL_MULTIPLIER = 0.9
const NAV_SCROLL_DURATION = 1.6
const NAV_SCROLL_OFFSET = -24

/**
 * Mutable store shared between the DOM and the WebGL scene. Kept outside React
 * so per-frame reads in useFrame never trigger re-renders.
 */
export const scrollState = {
  /** Fractional section index: 0 = hero centred, 1 = about centred, ... */
  station: 0,
  /** Scroll velocity from Lenis, roughly px per frame. */
  velocity: 0,
  /** Pointer position normalised to -1..1. */
  pointerX: 0,
  pointerY: 0,
}

if (import.meta.env.DEV) Object.assign(window, { __scrollState: scrollState })

export const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null
let anchors: number[] = []

function measureAnchors() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-station]'))
  const max = document.documentElement.scrollHeight - window.innerHeight
  // A station is "reached" when its section is centred in the viewport.
  anchors = sections.map((el, index) =>
    index === 0 ? 0 : clamp(el.offsetTop + (el.offsetHeight - window.innerHeight) * HALF, 0, max),
  )
}

function updateStation(y: number) {
  const lastSpan = anchors.length - DOUBLE
  if (lastSpan < 0) return
  const nextIndex = anchors.findIndex((anchor, index) => index > 0 && y <= anchor)
  const i = nextIndex === -1 ? lastSpan : clamp(nextIndex - 1, 0, lastSpan)
  const span = anchors[i + 1] - anchors[i] || 1
  scrollState.station = clamp(i + (y - anchors[i]) / span, 0, anchors.length - 1)
}

export function initScroll() {
  measureAnchors()

  const onPointer = (e: PointerEvent) => {
    scrollState.pointerX = (e.clientX / window.innerWidth) * DOUBLE - 1
    scrollState.pointerY = 1 - (e.clientY / window.innerHeight) * DOUBLE
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  const ro = new ResizeObserver(() => {
    measureAnchors()
    ScrollTrigger.refresh()
  })
  ro.observe(document.body)

  const tick = (time: number) => lenis?.raf(time * MS_PER_SECOND)
  const onNativeScroll = () => updateStation(window.scrollY)

  // Native scroll is the source of truth so anchor jumps, keyboard and scrollbar drags all move the camera.
  window.addEventListener('scroll', onNativeScroll, { passive: true })
  if (!prefersReducedMotion) {
    lenis = new Lenis({ lerp: LENIS_LERP, wheelMultiplier: LENIS_WHEEL_MULTIPLIER, autoRaf: false })
    lenis.on('scroll', (instance: Lenis) => {
      scrollState.velocity = instance.velocity
      ScrollTrigger.update()
    })
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
  }
  onNativeScroll()

  return () => {
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('scroll', onNativeScroll)
    ro.disconnect()
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: NAV_SCROLL_DURATION, offset: id === 'home' ? 0 : NAV_SCROLL_OFFSET })
  else el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
}

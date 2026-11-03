import { useSyncExternalStore } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DOUBLE, HALF, MS_PER_SECOND, clamp } from './math'
import { reduceMotion } from './quality'

export { reduceMotion }

gsap.registerPlugin(ScrollTrigger)

const LENIS_LERP = 0.12
const LENIS_WHEEL_MULTIPLIER = 0.9
const ANCHOR_SCROLL_DURATION = 1.4
const ANCHOR_OFFSET = -96

/**
 * Mutable store shared between the DOM and the WebGL scene. Kept outside React
 * so per-frame reads in useFrame never trigger re-renders.
 */
export const scrollState = {
  /** 0 at the top of the current page, 1 at the bottom. */
  progress: 0,
  /** Scroll velocity from Lenis, roughly px per frame. */
  velocity: 0,
  /** Pointer position normalised to -1..1. */
  pointerX: 0,
  pointerY: 0,
  /** Extra spin (radians) that page widgets such as the project carousel feed into the scene. */
  spin: 0,
  /** Index of the list item currently centred on screen (layers, jobs, services); -1 when none. */
  focus: -1,
}

if (import.meta.env.DEV) Object.assign(window, { __scrollState: scrollState })


let lenis: Lenis | null = null

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  scrollState.progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
}

export function initScroll() {
  const onPointer = (e: PointerEvent) => {
    scrollState.pointerX = (e.clientX / window.innerWidth) * DOUBLE - 1
    scrollState.pointerY = 1 - (e.clientY / window.innerHeight) * DOUBLE
  }
  window.addEventListener('pointermove', onPointer, { passive: true })
  // Native scroll is the source of truth so keyboard, scrollbar and anchor jumps all reach the scene.
  window.addEventListener('scroll', updateProgress, { passive: true })

  const ro = new ResizeObserver(() => {
    updateProgress()
    ScrollTrigger.refresh()
  })
  ro.observe(document.body)

  const tick = (time: number) => lenis?.raf(time * MS_PER_SECOND)
  if (!reduceMotion) {
    lenis = new Lenis({ lerp: LENIS_LERP, wheelMultiplier: LENIS_WHEEL_MULTIPLIER, autoRaf: false })
    lenis.on('scroll', (instance: Lenis) => {
      scrollState.velocity = instance.velocity
      ScrollTrigger.update()
    })
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
  }
  updateProgress()

  return () => {
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('scroll', updateProgress)
    ro.disconnect()
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
  updateProgress()
}

export function scrollToTopSmooth() {
  if (lenis) lenis.scrollTo(0, { duration: ANCHOR_SCROLL_DURATION })
  else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

const scrollLocks = new Set<string>()
const lockListeners = new Set<() => void>()

/**
 * Freezes page scrolling behind overlays (menu, command palette, project dialog). Each overlay
 * locks under its own name, so one closing never unlocks the page while another is still open.
 */
export function lockScroll(owner: string, locked: boolean) {
  const wasLocked = scrollLocks.size > 0
  if (locked) scrollLocks.add(owner)
  else scrollLocks.delete(owner)
  const isLocked = scrollLocks.size > 0
  if (isLocked === wasLocked) return
  if (isLocked) lenis?.stop()
  else lenis?.start()
  document.documentElement.classList.toggle('scroll-locked', isLocked)
  lockListeners.forEach((notify) => notify())
}

/** True while an overlay covers the page; the 3D scene stops rendering behind it. */
export const useScrollLocked = () =>
  useSyncExternalStore(
    (notify) => {
      lockListeners.add(notify)
      return () => {
        lockListeners.delete(notify)
      }
    },
    () => scrollLocks.size > 0,
  )

/** Scrolls an element to the middle of the screen, which is also where list items count as focused. */
export function scrollToCentre(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const offset = -(window.innerHeight - el.offsetHeight) * HALF
  if (lenis) lenis.scrollTo(el, { duration: ANCHOR_SCROLL_DURATION, offset })
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduceMotion ? 'auto' : 'smooth' })
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: ANCHOR_SCROLL_DURATION, offset: ANCHOR_OFFSET })
  else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
}

import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { appLoaded, isAppLoaded } from './intro'
import { playIntro, setupReveals } from './reveal'

/**
 * Attach to a page's root element: plays its title intro (after the loader on first visit)
 * and wires its scroll-driven 3D reveals, all reverted when the page unmounts.
 */
export function usePageEffects<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let ctx: gsap.Context | undefined
    let cancelled = false
    let frame = 0
    const start = () => {
      if (cancelled) return
      ctx = gsap.context(() => playIntro(el), el)
      // The scroll reveals go up a frame later, in their own task: setting up dozens of scroll triggers is the
      // costliest part of opening a page, and it shouldn't share a frame with React swapping the page in.
      frame = requestAnimationFrame(() => {
        if (cancelled) return
        ctx?.add(() => setupReveals(el))
        ScrollTrigger.refresh()
      })
    }
    if (isAppLoaded()) start()
    else {
      const waitThenStart = async () => {
        await appLoaded
        start()
      }
      void waitThenStart()
    }
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      // Stop everything but skip restoring styles: the page's elements are about to be removed anyway.
      ctx?.kill()
    }
  }, [])

  return ref
}

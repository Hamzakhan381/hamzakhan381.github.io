import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'

/** A number that counts up from zero the first time it scrolls into view. */
export function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  // Set up just after the first paint (not inside the commit), so it never holds up a page switch: this sits
  // below the fold when a page opens.
  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion) return
    const counter = { n: 0 }
    el.textContent = `0${suffix}`
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        n: value,
        duration: motion.counter.duration,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => {
          el.textContent = `${Math.round(counter.n)}${suffix}`
        },
      })
    }, el)
    return () => ctx.revert()
  }, [value, suffix])

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  )
}

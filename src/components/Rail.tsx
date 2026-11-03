import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '../lib/scroll'
import { useMediaQuery } from '../lib/useMediaQuery'
import { HALF, clamp } from '../lib/math'
import motion from '../lib/motion.json'

const R = motion.rail

/**
 * Vertical scroll drives a horizontal track inside a pinned stage. Cards bend around the
 * centre like the inside of a cylinder: facing you in the middle, turned away at the edges.
 * Falls back to a plain grid on narrow screens and with reduced motion.
 */
export function Rail({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const wide = useMediaQuery('(min-width: 900px)')
  const pinned = wide && !prefersReducedMotion

  useLayoutEffect(() => {
    const el = ref.current
    const track = el?.querySelector<HTMLElement>('.rail__track')
    if (!el || !track || !pinned) return
    const cards = Array.from(track.children) as HTMLElement[]
    let distance = 0

    const measure = () => {
      track.style.transform = 'none'
      distance = Math.max(track.scrollWidth - window.innerWidth, 0)
      el.style.setProperty('--rail-distance', `${distance}px`)
    }
    const place = (progress: number) => {
      track.style.transform = `translate3d(${-progress * distance}px, 0, 0)`
      const mid = window.innerWidth * HALF
      cards.forEach((_, i) => {
        const card = cards[i]
        const box = card.getBoundingClientRect()
        const offset = clamp((box.left + box.width * HALF - mid) / mid, -1, 1)
        card.style.transform = `perspective(${motion.perspective}px) rotateY(${-offset * R.angle}deg) translateZ(${-Math.abs(offset) * R.depth}px) scale(${1 - Math.abs(offset) * R.scale})`
        card.style.opacity = String(1 - Math.abs(offset) * (1 - R.minOpacity))
      })
    }

    measure()
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => place(self.progress),
        onRefreshInit: measure,
        onRefresh: (self) => place(self.progress),
      })
    }, el)
    ScrollTrigger.refresh()
    return () => {
      ctx.revert()
      track.style.transform = ''
      cards.forEach((_, i) => {
        cards[i].style.transform = ''
        cards[i].style.opacity = ''
      })
    }
  }, [pinned])

  return (
    <div ref={ref} className={pinned ? 'rail rail--pinned' : 'rail'} role="region" aria-label={label}>
      <div className="rail__stage">
        <ol className="rail__track">{children}</ol>
      </div>
    </div>
  )
}

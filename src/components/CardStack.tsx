import { useEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import type { Project } from '../content'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'
import { FeaturedProject } from './ProjectCards'

const S = motion.journey.stack

/**
 * Projects as a deck that builds while you scroll: each card sticks a little below the one before, and as the
 * next card slides up over it, the card underneath shrinks, tips back and dims. Plain CSS sticky does the
 * stacking; the scroll timeline only adds the depth.
 */
export function CardStack({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLOListElement>(null)

  // Set up just after the first paint (not inside the commit), so it never holds up a page switch: this sits
  // below the fold when a page opens.
  useEffect(() => {
    const root = ref.current
    if (!root || reduceMotion) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('.cstack__item'))
    const ctx = gsap.context(() => {
      items.slice(0, -1).forEach((item, i) => {
        const next = items[i + 1]
        const settle = () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`
        const arriving = { trigger: next, start: 'top bottom', end: settle, scrub: true }
        gsap.to(item.querySelector('.cstack__card'), {
          scale: S.scale,
          rotateX: S.tilt,
          transformPerspective: motion.perspective,
          transformOrigin: '50% 0%',
          ease: 'none',
          scrollTrigger: arriving,
        })
        gsap.to(item.querySelector('.cstack__dim'), { opacity: S.dim, ease: 'none', scrollTrigger: arriving })
      })
    }, root)
    return () => ctx.revert()
  }, [projects])

  return (
    <ol ref={ref} className="cstack">
      {projects.map((project, i) => (
        <li key={project.slug} className="cstack__item" style={{ '--i': i } as CSSProperties}>
          <div className="cstack__card">
            <FeaturedProject project={project} index={i} total={projects.length} />
            <span className="cstack__dim" aria-hidden="true" />
          </div>
        </li>
      ))}
    </ol>
  )
}

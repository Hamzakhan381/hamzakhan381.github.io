import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import type { Project } from '../content'
import { FeaturedProject } from './ProjectCards'
import { prefersReducedMotion } from '../lib/scroll'
import { useMediaQuery } from '../lib/useMediaQuery'
import { flyIn } from '../lib/reveal'
import { DOUBLE, clamp } from '../lib/math'
import motion from '../lib/motion.json'

const G = motion.gallery

/**
 * Featured projects stacked along the z-axis inside a pinned stage: scrolling flies the camera
 * through them, each panel arriving from the depth and passing out past the viewer.
 */
export function DepthGallery({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const wide = useMediaQuery('(min-width: 900px)')
  const pinned = wide && !prefersReducedMotion

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const panels = Array.from(el.querySelectorAll<HTMLElement>('[data-panel]'))
    const ctx = gsap.context(() => {
      if (!pinned) {
        flyIn(panels)
        return
      }
      const last = Math.max(panels.length - 1, 1)
      const place = (progress: number) => {
        panels.forEach((_, i) => {
          const panel = panels[i]
          const d = progress * last - i
          const fade = d > 0 ? 1 - d * G.fadePast : 1 + d * G.fadeAhead
          panel.style.transform = `translate(-50%, -50%) translate3d(${d * (i % DOUBLE ? G.shiftX : -G.shiftX)}px, 0, ${d * G.depth}px) rotateY(${-d * G.rotateY}deg)`
          panel.style.opacity = String(clamp(fade, 0, 1))
          panel.style.pointerEvents = Math.abs(d) < G.fadeAhead ? 'auto' : 'none'
          panel.style.zIndex = String(panels.length - Math.round(Math.abs(d)))
        })
      }
      place(0)
      gsap.to(
        {},
        { scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (self) => place(self.progress) } },
      )
    }, el)
    return () => ctx.revert()
  }, [pinned, projects])

  return (
    <div
      ref={ref}
      className={pinned ? 'gallery gallery--pinned' : 'gallery'}
      style={{ '--screens': projects.length * G.screens + 1 } as CSSProperties}
    >
      <div className="gallery__stage">
        {projects.map((project, i) => (
          <div key={project.slug} className="gallery__panel" data-panel>
            <FeaturedProject project={project} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}

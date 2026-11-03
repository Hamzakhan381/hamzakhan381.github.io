import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Project } from '../content'
import { ProjectCard } from './ProjectCards'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'

gsap.registerPlugin(Flip)

const ALL = 'All'

/** All projects with category chips; filtering re-flows the grid with a FLIP animation. */
export function FilterGrid({ projects, categories }: { projects: Project[]; categories: string[] }) {
  const grid = useRef<HTMLUListElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)
  const [filter, setFilter] = useState(ALL)
  const used = categories.filter((c) => projects.some((p) => p.category === c))
  const count = (c: string) => (c === ALL ? projects.length : projects.filter((p) => p.category === c).length)

  const choose = (next: string) => {
    if (grid.current && !reduceMotion) flipState.current = Flip.getState(grid.current.children)
    setFilter(next)
  }

  useLayoutEffect(() => {
    const state = flipState.current
    if (!state || !grid.current) return
    flipState.current = null
    Flip.from(state, {
      duration: motion.flip.duration,
      ease: 'power3.inOut',
      absolute: true,
      scale: true,
      onComplete: () => ScrollTrigger.refresh(),
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: motion.flip.scale }, { opacity: 1, scale: 1, duration: motion.flip.duration }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: motion.flip.scale, duration: motion.flip.duration }),
    })
  }, [filter])

  return (
    <div className="filter">
      <div className="filter__chips" role="toolbar" aria-label="Filter projects by category">
        {[ALL, ...used].map((c) => (
          <button key={c} type="button" className="filter__chip" aria-pressed={filter === c} onClick={() => choose(c)}>
            {c} <span>{count(c)}</span>
          </button>
        ))}
      </div>
      <ul ref={grid} className="filter__grid">
        {projects.map((project) => (
          <li key={project.slug} hidden={filter !== ALL && project.category !== filter} data-fly>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </div>
  )
}

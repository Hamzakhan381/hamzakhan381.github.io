import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Job } from '../content'
import { branchSlug, fakeHash } from '../lib/commit'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'

const B = motion.journey.beam
/** The runner is as tall as the track with the head at its bottom: shifted up by its full height, the head sits at the top. */
const RUNNER_START = -100

/**
 * The career as a git log with a light beam down its spine. The beam grows with your scroll, its glowing head
 * travels down the track, and each commit lights up once the beam reaches it while its card slides in.
 */
export function BeamTimeline({ jobs }: { jobs: Job[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('.beam__item'))
    if (reduceMotion) {
      root.classList.add('is-static')
      items.forEach((item) => item.classList.add('is-lit'))
      return
    }
    const ctx = gsap.context(() => {
      const grow = { trigger: root, start: B.start, end: B.end, scrub: true }
      gsap.fromTo('.beam__fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: grow })
      gsap.fromTo('.beam__runner', { yPercent: RUNNER_START }, { yPercent: 0, ease: 'none', scrollTrigger: grow })
      items.forEach((item) => {
        ScrollTrigger.create({ trigger: item, start: B.lit, end: 'max', toggleClass: { targets: item, className: 'is-lit' } })
        gsap.fromTo(
          item.querySelector('.beam__card'),
          { opacity: 0, x: B.x },
          { opacity: 1, x: 0, ease: 'power2.out', scrollTrigger: { trigger: item, start: B.cardStart, end: B.cardEnd, scrub: true } },
        )
      })
    }, root)
    return () => ctx.revert()
  }, [jobs])

  return (
    <div ref={ref} className="beam">
      <div className="beam__track" aria-hidden="true">
        <span className="beam__fill" />
        <span className="beam__runner">
          <span className="beam__head" />
        </span>
      </div>
      <ol className="beam__list">
        {jobs.map((job) => (
          <li key={job.org + job.role} className="beam__item">
            <span className="beam__node" aria-hidden="true" />
            <article className="card beam__card">
              <p className="gitlog__meta">
                <span className="gitlog__hash">commit {fakeHash(job.org + job.role)}</span>
                <span className="gitlog__branch">feat/{branchSlug(job.org)}</span>
              </p>
              <p className="gitlog__date">
                {job.period} · {job.type}
              </p>
              <h3>
                {job.role} <span className="accent">@ {job.org}</span>
              </h3>
              <p>{job.summary}</p>
              {job.stack.length ? (
                <ul className="tags">
                  {job.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
    </div>
  )
}

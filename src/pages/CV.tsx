import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'
import { cv, profile } from '../content'
import { appLoaded } from '../lib/intro'
import { reduceMotion } from '../lib/scroll'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'
import motion from '../lib/motion.json'

const { paperLand: LAND, paperScrollTilt: SCROLL_TILT } = motion
const PAPER_TILT = 3

export default function CV() {
  const ref = usePageEffects<HTMLDivElement>()
  const paper = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = paper.current
    if (!el || reduceMotion) return
    let ctx: gsap.Context | undefined
    let cancelled = false
    gsap.set(el, { opacity: 0 })
    const land = async () => {
      await appLoaded
      if (cancelled) return
      ctx = gsap.context(() => {
        gsap.fromTo(
          el,
          { opacity: 0, rotateX: LAND.rotateX, z: LAND.z, y: LAND.y, transformPerspective: motion.perspective, transformOrigin: '50% 0%' },
          { opacity: 1, rotateX: 0, z: 0, y: 0, duration: LAND.duration, delay: LAND.delay, ease: 'expo.out' },
        )
        gsap.fromTo(
          el.parentElement,
          { rotateX: SCROLL_TILT.start, transformPerspective: motion.perspective },
          { rotateX: SCROLL_TILT.end, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
        )
      })
    }
    void land()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return (
    <div ref={ref} className="page page--cv">
      <PageHero hero={cv.hero}>
        <div className="actions">
          <button type="button" className="btn" onClick={() => window.print()}>
            <Icon name="printer" /> Print / Save PDF
          </button>
          <Link to="/contact" className="btn btn--ghost">
            Contact me <Icon name="arrow" />
          </Link>
        </div>
      </PageHero>

      <section className="section container cv-stage">
        <aside className="cv-facts" aria-label="Quick facts">
          {cv.quickFacts.map((f) => (
            <div key={f.label} className="cv-fact card" data-fly>
              <span>{f.label}</span>
              <strong>{f.value}</strong>
            </div>
          ))}
        </aside>
        <div className="cv-tilt">
          <Tilt className="paper-tilt" max={PAPER_TILT}>
            <div ref={paper} className="paper">
              <header className="paper__head">
                <h2>{profile.name}</h2>
                <p>{cv.contactLine.join('  |  ')}</p>
              </header>

              <section>
                <h3>Summary</h3>
                <p>{cv.summary}</p>
              </section>

              <section>
                <h3>Experience</h3>
                {cv.experience.map((job) => (
                  <div key={job.org} className="paper__entry">
                    <div className="paper__row">
                      <strong>{job.org}</strong>
                      <span>{job.place}</span>
                    </div>
                    <div className="paper__row paper__row--sub">
                      <em>{job.role}</em>
                      <span>{job.period}</span>
                    </div>
                    <ul>
                      {job.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <section>
                <h3>Projects</h3>
                {cv.projects.map((proj) => (
                  <div key={proj.name} className="paper__entry">
                    <div className="paper__row">
                      <span>
                        <strong>{proj.name}</strong> | <em>{proj.stack}</em>
                      </span>
                      <span>{proj.kind}</span>
                    </div>
                    <div className="paper__row paper__row--sub">
                      <em>{proj.role}</em>
                    </div>
                    <ul>
                      {proj.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <section>
                <h3>Technical Skills</h3>
                <ul className="paper__skills">
                  {cv.skills.map((group) => (
                    <li key={group.label}>
                      <strong>{group.label}:</strong> {group.items.join(', ')}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Education</h3>
                <div className="paper__entry">
                  <div className="paper__row">
                    <strong>{cv.education.school}</strong>
                    <span>{cv.education.place}</span>
                  </div>
                  <div className="paper__row paper__row--sub">
                    <em>{cv.education.degree}</em>
                  </div>
                  <p>{cv.education.detail}</p>
                </div>
              </section>
            </div>
          </Tilt>
        </div>
      </section>
    </div>
  )
}

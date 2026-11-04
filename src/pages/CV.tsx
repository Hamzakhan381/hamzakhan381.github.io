import { useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { cv, profile } from '../content'
import { appLoaded } from '../lib/intro'
import { reduceMotion } from '../lib/scroll'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon } from '../components/Icon'
import motion from '../lib/motion.json'

const LAND = motion.paperLand

/** One line of a paper section: it fades up in its turn (`--i` per entry, `--j` per bullet) once the section is reached. */
const line = (i: number, j = 0) => ({ 'data-line': '', style: { '--i': i, '--j': j } as CSSProperties })

/**
 * When the paper scrolls into view it lands (a CSS transition, so it ends with no lingering 3D layer), a scanner
 * light sweeps down it, an availability stamp lands on the corner, and each section writes itself in as you reach
 * it. All of it is transforms and opacity on small elements, so the page stays smooth on modest GPUs.
 */
function usePrintedPaper() {
  const paper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = paper.current
    if (!el) return
    const sections = Array.from(el.querySelectorAll<HTMLElement>('[data-paper-section]'))
    if (reduceMotion) {
      el.classList.add('is-landed', 'is-printed')
      sections.forEach((section) => section.classList.add('is-in'))
      return
    }
    const sectionWatch = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          sectionWatch.unobserve(entry.target)
        }),
      { rootMargin: LAND.revealMargin },
    )
    let printTimer = 0
    const paperWatch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        paperWatch.disconnect()
        el.classList.add('is-landed')
        printTimer = window.setTimeout(() => {
          el.classList.add('is-printed')
          sections.forEach((section) => sectionWatch.observe(section))
        }, LAND.printAtMs)
      },
      { rootMargin: LAND.landMargin },
    )
    let cancelled = false
    const watch = async () => {
      await appLoaded
      if (!cancelled) paperWatch.observe(el)
    }
    void watch()
    return () => {
      cancelled = true
      window.clearTimeout(printTimer)
      paperWatch.disconnect()
      sectionWatch.disconnect()
    }
  }, [])

  return paper
}

export default function CV() {
  const ref = usePageEffects<HTMLDivElement>()
  const paper = usePrintedPaper()

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
        <div className="paper-wrap">
          <div ref={paper} className="paper">
            <span className="paper__scan" aria-hidden="true" />
            <span className={`paper__stamp ${profile.availability.open ? '' : 'paper__stamp--busy'}`} aria-hidden="true">
              {profile.availability.open ? 'Open to work' : 'Booked'}
            </span>
            <header className="paper__head">
              <h2>{profile.name}</h2>
              <p>{cv.contactLine.join('  |  ')}</p>
            </header>

            <section data-paper-section>
              <h3>Summary</h3>
              <p {...line(0)}>{cv.summary}</p>
            </section>

            <section data-paper-section>
              <h3>Experience</h3>
              {cv.experience.map((job, i) => (
                <div key={job.org} className="paper__entry" {...line(i)}>
                  <div className="paper__row">
                    <strong>{job.org}</strong>
                    <span>{job.place}</span>
                  </div>
                  <div className="paper__row paper__row--sub">
                    <em>{job.role}</em>
                    <span>{job.period}</span>
                  </div>
                  <ul>
                    {job.points.map((p, j) => (
                      <li key={p} {...line(i, j + 1)}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section data-paper-section>
              <h3>Projects</h3>
              {cv.projects.map((proj, i) => (
                <div key={proj.name} className="paper__entry" {...line(i)}>
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
                    {proj.points.map((p, j) => (
                      <li key={p} {...line(i, j + 1)}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section data-paper-section>
              <h3>Technical Skills</h3>
              <ul className="paper__skills">
                {cv.skills.map((group, j) => (
                  <li key={group.label} {...line(0, j)}>
                    <strong>{group.label}:</strong> {group.items.join(', ')}
                  </li>
                ))}
              </ul>
            </section>

            <section data-paper-section>
              <h3>Education</h3>
              <div className="paper__entry" {...line(0)}>
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
        </div>
      </section>
    </div>
  )
}

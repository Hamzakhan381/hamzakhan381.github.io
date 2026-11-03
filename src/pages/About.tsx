import type { CSSProperties } from 'react'
import { about, career, cv, profile } from '../lib/content'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Tilt } from '../components/Tilt'

export default function About() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page">
      <PageHero
        eyebrow="About"
        lines={["Hello, I'm Hamza.", 'I build software', 'that lasts.']}
        accent={2}
        lead={about.goal}
      />

      <section className="section container about">
        <Tilt className="portrait" data-fly>
          <span className="portrait__frame" aria-hidden="true" />
          <img
            src="/mypic-480.webp"
            srcSet="/mypic-480.webp 480w, /mypic-960.webp 960w"
            sizes="(min-width: 900px) 360px, 80vw"
            width={480}
            height={640}
            alt={`Portrait of ${profile.name}`}
            loading="lazy"
            decoding="async"
          />
          <span className="portrait__tag">
            <span className="pulse-dot" aria-hidden="true" /> Open to work
          </span>
        </Tilt>

        <div className="about__copy">
          <p className="about__role" data-reveal>
            {profile.role}
          </p>
          <p data-reveal>{about.intro}</p>
          <p data-reveal>{about.body}</p>
          <dl className="stats">
            {about.stats.map((s) => (
              <div key={s.label} className="stat" data-fly>
                <dd>{s.value}</dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section container">
        <header className="section-head">
          <p className="eyebrow" data-reveal>
            Career
          </p>
          <h2 className="heading" data-reveal>
            The road <span className="accent">so far.</span>
          </h2>
        </header>
        <ol className="timeline">
          {career.map((job, i) => (
            <li key={job.org} className="timeline__item" style={{ '--i': i } as CSSProperties}>
              <span className="timeline__node" aria-hidden="true" />
              <Tilt className="card timeline__card" data-swing>
                <span className="chip">{job.period}</span>
                <h3>{job.role}</h3>
                <p className="timeline__org">@ {job.org}</p>
                <p>{job.text}</p>
              </Tilt>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container">
        <header className="section-head">
          <p className="eyebrow" data-reveal>
            Toolkit
          </p>
          <h2 className="heading" data-reveal>
            Skills, <span className="accent">pressed daily.</span>
          </h2>
        </header>
        <div className="skills">
          {cv.skills.map((group) => (
            <div key={group.label} className="skills__group" data-fly>
              <h3>{group.label}</h3>
              <ul className="keys">
                {group.items.map((item) => (
                  <li key={item} className="key">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

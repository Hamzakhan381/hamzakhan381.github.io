import { about, career, profile } from '../lib/content'
import { Tilt } from '../components/Tilt'

export function About() {
  return (
    <section id="about" data-station className="section about">
      <div className="container about__grid">
        <Tilt className="portrait" data-fly>
          <img
            src="/mypic-480.webp"
            srcSet="/mypic-480.webp 480w, /mypic-960.webp 960w"
            sizes="(min-width: 900px) 340px, 70vw"
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
          <p className="eyebrow" data-depth>About</p>
          <h2 className="heading" data-depth>
            Hello, I'm <span className="text-gradient">Hamza.</span>
          </h2>
          <p className="about__role" data-depth>{profile.role}</p>
          <p data-depth>{about.intro}</p>
          <p data-depth>{about.body}</p>
          <p className="about__goal" data-depth>{about.goal}</p>
          <dl className="stats">
            {about.stats.map((s) => (
              <div key={s.label} className="stat" data-fly>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="container timeline" data-timeline>
        <h3 className="timeline__title" data-depth>Career trajectory</h3>
        <ol className="timeline__track">
          {career.map((job, i) => (
            <li key={job.org} className="timeline__item" data-timeline-item style={{ '--i': i } as React.CSSProperties}>
              <Tilt className="card timeline__card">
                <span className="timeline__period">{job.period}</span>
                <h4>{job.role}</h4>
                <p className="timeline__org">@ {job.org}</p>
                <p>{job.text}</p>
              </Tilt>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

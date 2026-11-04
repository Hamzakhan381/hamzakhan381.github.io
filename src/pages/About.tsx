import { about, education, experience, profile, skills } from '../content'
import { usePageEffects } from '../lib/usePageEffects'
import { useFocusIndex } from '../lib/useFocusIndex'
import { branchSlug, fakeHash } from '../lib/commit'
import { profileCode, profileFile } from '../lib/profileCode'
import { PageHero } from '../components/PageHero'
import { SectionHead } from '../components/Section'
import { CodeWindow } from '../components/CodeWindow'
import { SkillBars } from '../components/SkillBars'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'
import { Rail } from '../components/Rail'

const INDEX_DIGITS = 2
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')

function Experience() {
  const { ref, active } = useFocusIndex<HTMLOListElement>()
  return (
    <section className="section container" data-track="experience">
      <SectionHead eyebrow="Experience" title="git log" accent="--career" lead="Scroll through the history. Each role is a band in the code DNA; the one you're reading lights up." />
      <ol ref={ref} className="gitlog">
        {experience.map((job, i) => (
          <li key={job.org} id={`job-${i}`} data-focus-item className={`gitlog__item ${active === i ? 'is-active' : ''}`}>
            <Tilt className="card gitlog__card" data-swing>
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
              <ul className="checks">
                {job.highlights.map((h) => (
                  <li key={h}>
                    <Icon name="check" /> {h}
                  </li>
                ))}
              </ul>
              {job.stack.length ? (
                <ul className="tags">
                  {job.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </Tilt>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function About() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page">
      <PageHero hero={about.hero} />

      <section className="section container about">
        <Tilt className="portrait" data-fly>
          <span className="portrait__frame" aria-hidden="true" />
          <img
            src={profile.photo.small}
            srcSet={`${profile.photo.small} 480w, ${profile.photo.large} 960w`}
            sizes="(min-width: 900px) 360px, 80vw"
            width={480}
            height={640}
            alt={profile.photo.alt}
            loading="lazy"
            decoding="async"
          />
          <span className="portrait__tag">
            <span className="pulse-dot" aria-hidden="true" /> {profile.availability.open ? 'Open to work' : 'Busy right now'}
          </span>
        </Tilt>
        <div className="about__copy">
          <p className="about__role" data-reveal>
            {profile.role} · {profile.location}
          </p>
          {about.bio.map((p) => (
            <p key={p} data-reveal>
              {p}
            </p>
          ))}
          <dl className="stats">
            {about.highlights.map((s) => (
              <div key={s.label} className="stat" data-fly>
                <dd>{s.value}</dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section container split">
        <SectionHead eyebrow="In code" title="The short version," accent="typed." lead="Same facts, different syntax." />
        <CodeWindow filename={profileFile} lines={profileCode} />
      </section>

      <Experience />

      {education.length ? (
        <section className="section container">
          <SectionHead eyebrow="Education" title="Where I'm learning." />
          <div className="edu">
            {education.map((e) => (
              <Tilt key={e.school} className="card edu__card" data-fly>
                <p className="chip">{e.period}</p>
                <h3>{e.degree}</h3>
                <p className="edu__school">
                  {e.school} · {e.location}
                </p>
                <p className="edu__detail">{e.detail}</p>
                <ul className="tags">
                  {e.focus.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </Tilt>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section container">
        <SectionHead eyebrow="Skills" title="What I work with," accent="and how well." />
        <SkillBars groups={skills.groups} />
        <ul className="keys" aria-label="Tools">
          {skills.tools.map((tool) => (
            <li key={tool} className="key" data-fly>
              <span>{tool}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section section--flush">
        <div className="container">
          <SectionHead eyebrow={about.principles.eyebrow} title={about.principles.title} lead="Keep scrolling: the track moves sideways." />
        </div>
        <Rail label={about.principles.title}>
          {about.principles.items.map((p, i) => (
            <li key={p.title} className="card principle">
              <span className="principle__num">{pad(i + 1)}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </Rail>
      </section>

      <section className="section container">
        <SectionHead eyebrow={about.now.eyebrow} title={about.now.title} />
        <ul className="now">
          {about.now.items.map((n) => (
            <li key={n.label} className="now__item" data-reveal>
              <span className="now__label">{n.label}</span>
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {about.certifications.length ? (
        <section className="section container">
          <SectionHead eyebrow="Certifications" title="Verified." />
          <ul className="certs">
            {about.certifications.map((c) => (
              <li key={c.name} className="card cert" data-fly>
                <h3>{c.name}</h3>
                <p>
                  {c.issuer} · {c.date}
                </p>
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noreferrer">
                    View credential <Icon name="arrowUpRight" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

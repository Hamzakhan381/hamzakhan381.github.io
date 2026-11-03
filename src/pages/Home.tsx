import { Link } from 'react-router'
import { home, profile, projectBySlug, skills, type Project } from '../content'
import { usePageEffects } from '../lib/usePageEffects'
import { useFocusIndex } from '../lib/useFocusIndex'
import { PageHero } from '../components/PageHero'
import { SectionHead } from '../components/Section'
import { Terminal } from '../components/Terminal'
import { TagSphere } from '../components/TagSphere'
import { Counter } from '../components/Counter'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'

const INDEX_DIGITS = 2
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')
const featured = home.featured.slugs.map(projectBySlug).filter((p): p is Project => Boolean(p))
const sphereTags = Array.from(new Set([...home.marquee, ...skills.tools, ...skills.groups.flatMap((g) => g.items.map((s) => s.name))]))

function Layers() {
  const { ref, active } = useFocusIndex<HTMLOListElement>()
  return (
    <section className="section container layers">
      <SectionHead eyebrow={home.layers.eyebrow} title={home.layers.title} accent={home.layers.accent} />
      <ol ref={ref} className="layers__list">
        {home.layers.items.map((layer, i) => (
          <li key={layer.name} data-focus-item className={`layer card ${active === i ? 'is-active' : ''}`} data-swing>
            <span className="layer__num">{pad(i + 1)}</span>
            <div>
              <h3>{layer.name}</h3>
              <p className="layer__tagline">{layer.tagline}</p>
              <p>{layer.text}</p>
              <ul className="tags">
                {layer.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Home() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page page--home">
      <div data-track="stack">
        <section className="home-hero">
          <PageHero hero={home.hero}>
            <span className="status">
              <span className="pulse-dot" aria-hidden="true" /> {profile.availability.label}
            </span>
            <div className="actions">
              <Link to="/projects" className="btn">
                See my work <Icon name="arrow" />
              </Link>
              <Link to="/cv" className="btn btn--ghost">
                <Icon name="file" /> View CV
              </Link>
            </div>
          </PageHero>
          <div className="marquee" aria-label={`Tech stack: ${home.marquee.join(', ')}`} data-intro>
            <div className="marquee__track" aria-hidden="true">
              {[...home.marquee, ...home.marquee].map((item, i) => (
                <span key={`${item}-${i}`}>{item}</span>
              ))}
            </div>
          </div>
          <p className="scroll-hint" data-intro aria-hidden="true">
            <Icon name="terminal" /> scroll to explode the stack
          </p>
        </section>
        <Layers />
      </div>

      <section className="section container split">
        <SectionHead eyebrow={home.terminal.eyebrow} title={home.terminal.title} lead="Every line below is typed by your scroll wheel." />
        <Terminal host={home.terminal.host} session={home.terminal.session} />
      </section>

      {featured.length ? (
        <section className="section container">
          <SectionHead eyebrow={home.featured.eyebrow} title={home.featured.title} />
          <ul className="feature-cards">
            {featured.map((project, i) => (
              <li key={project.slug} data-fly>
                <Tilt as={Link} to="/projects" className="card feature-card">
                  <span className="feature-card__num">{pad(i + 1)}</span>
                  <span className="chip">{project.category}</span>
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  <ul className="tags">
                    {project.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <span className="feature-card__go" aria-hidden="true">
                    <Icon name="arrowUpRight" />
                  </span>
                </Tilt>
              </li>
            ))}
          </ul>
          <Link to="/projects" className="btn btn--ghost center">
            All projects <Icon name="arrow" />
          </Link>
        </section>
      ) : null}

      <section className="section container split split--reverse">
        <SectionHead eyebrow={home.stackSphere.eyebrow} title={home.stackSphere.title} lead={home.stackSphere.lead} />
        <TagSphere tags={sphereTags} label="Technologies I use" />
      </section>

      <section className="section container">
        <dl className="stats stats--wide">
          {home.stats.map((s) => (
            <div key={s.label} className="stat" data-fly>
              <dd>
                <Counter value={s.value} suffix={s.suffix} />
              </dd>
              <dt>{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {home.testimonials.length ? (
        <section className="section container">
          <SectionHead eyebrow="Kind words" title="What people say." />
          <ul className="quotes">
            {home.testimonials.map((t) => (
              <li key={t.name} className="card quote" data-fly>
                <blockquote>“{t.quote}”</blockquote>
                <p>
                  <strong>{t.name}</strong> · {t.role}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

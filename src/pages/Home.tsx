import { Link } from 'react-router'
import { about, explore, profile, stack } from '../lib/content'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'

export default function Home() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page page--home">
      <section className="home-hero">
        <PageHero
          eyebrow="Software Engineer · Full-Stack"
          lines={['I engineer scalable', 'systems & sharp', 'interfaces.']}
          accent={2}
          lead={
            <>
              I'm <strong>{profile.name}</strong>. I design backend architecture, data systems and fast, modern
              frontends, and I care about the details in both.
            </>
          }
        >
          <span className="status">
            <span className="pulse-dot" aria-hidden="true" /> Available for new projects
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

        <div className="marquee" aria-label={`Tech stack: ${stack.join(', ')}`} data-intro>
          <div className="marquee__track" aria-hidden="true">
            {[...stack, ...stack].map((item, i) => (
              <span key={`${item}-${i}`}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <header className="section-head">
          <p className="eyebrow" data-reveal>
            Explore
          </p>
          <h2 className="heading" data-reveal>
            Pick a door. <span className="accent">Each one is its own world.</span>
          </h2>
        </header>
        <ul className="explore">
          {explore.map((item, i) => (
            <li key={item.to} data-fly>
              <Tilt as={Link} to={item.to} className="card explore__card">
                <span className="explore__num">0{i + 1}</span>
                <span className="explore__label">{item.label}</span>
                <span className="explore__text">{item.text}</span>
                <span className="explore__go" aria-hidden="true">
                  <Icon name="arrowUpRight" />
                </span>
              </Tilt>
            </li>
          ))}
        </ul>
      </section>

      <section className="section container">
        <dl className="stats stats--wide">
          {about.stats.map((s) => (
            <div key={s.label} className="stat" data-fly>
              <dd>{s.value}</dd>
              <dt>{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

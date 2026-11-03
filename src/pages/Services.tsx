import { useState } from 'react'
import { Link } from 'react-router'
import { process, services } from '../lib/content'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon } from '../components/Icon'

function FlipCard({ index }: { index: number }) {
  const s = services[index]
  const [flipped, setFlipped] = useState(false)
  return (
    <div className={`flip ${flipped ? 'is-flipped' : ''}`}>
      <div className="flip__inner">
        <div className="flip__face flip__front card" aria-hidden={flipped}>
          <span className="flip__num">0{index + 1}</span>
          <span className="service__icon">
            <Icon name={s.icon} />
          </span>
          <h3>{s.title}</h3>
          <span className="flip__hint">Hover or tap to flip</span>
        </div>
        <div className="flip__face flip__back card" aria-hidden={!flipped}>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
          <ul className="tags">
            {s.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <Link to="/contact" className="flip__link" tabIndex={flipped ? 0 : -1}>
            Start a project <Icon name="arrow" />
          </Link>
        </div>
      </div>
      <button
        type="button"
        className="flip__toggle"
        aria-pressed={flipped}
        aria-label={`${flipped ? 'Hide' : 'Show'} details for ${s.title}`}
        onClick={() => setFlipped((v) => !v)}
      />
    </div>
  )
}

export default function Services() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page">
      <PageHero
        eyebrow="Services"
        lines={['What I can', 'build for you.']}
        accent={1}
        lead="Six disciplines, one goal: software that's reliable on day one and still easy to change on day one thousand."
      />

      <section className="section container">
        <ul className="flips">
          {services.map((s, i) => (
            <li key={s.title} data-fly>
              <FlipCard index={i} />
            </li>
          ))}
        </ul>
      </section>

      <section className="section container">
        <header className="section-head">
          <p className="eyebrow" data-reveal>
            Process
          </p>
          <h2 className="heading" data-reveal>
            Four steps, <span className="accent">no surprises.</span>
          </h2>
        </header>
        <ol className="stairs">
          {process.map((step, i) => (
            <li key={step.title} className="card stair" data-stair>
              <span className="stair__num">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

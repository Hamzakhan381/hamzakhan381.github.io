import { Link } from 'react-router'
import { services } from '../content'
import { usePageEffects } from '../lib/usePageEffects'
import { useFocusIndex } from '../lib/useFocusIndex'
import { PageHero } from '../components/PageHero'
import { Accordion, SectionHead } from '../components/Section'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'

const INDEX_DIGITS = 2
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')

function ServiceList() {
  const { ref, active } = useFocusIndex<HTMLOListElement>()
  return (
    <section className="section container" data-track="services">
      <SectionHead eyebrow="What I offer" title="One rack," accent="six services." lead="Each unit in the rack slides out as you reach its service." />
      <ol ref={ref} className="svc">
        {services.items.map((s, i) => (
          <li key={s.id} data-focus-item className={`svc__item ${active === i ? 'is-active' : ''}`}>
            <Tilt className="card svc__card" data-swing>
              <div className="svc__head">
                <span className="svc__num">{pad(i + 1)}</span>
                <span className="service__icon">
                  <Icon name={s.icon} />
                </span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.summary}</p>
              <p className="svc__label">You get</p>
              <ul className="checks">
                {s.deliverables.map((d) => (
                  <li key={d}>
                    <Icon name="check" /> {d}
                  </li>
                ))}
              </ul>
              <ul className="tags">
                {s.stack.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Tilt>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Services() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page">
      <PageHero hero={services.hero}>
        <div className="actions">
          <Link to="/contact" className="btn">
            Start a project <Icon name="arrow" />
          </Link>
          <Link to="/projects" className="btn btn--ghost">
            See past work
          </Link>
        </div>
      </PageHero>

      <ServiceList />

      <section className="section container">
        <SectionHead eyebrow={services.process.eyebrow} title={services.process.title} />
        <ol className="stairs">
          {services.process.items.map((step, i) => (
            <li key={step.title} className="card stair" data-stair>
              <span className="stair__num">{pad(i + 1)}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container">
        <SectionHead eyebrow={services.engagements.eyebrow} title={services.engagements.title} />
        <div className="plans">
          {services.engagements.items.map((plan) => (
            <Tilt key={plan.title} className="card plan" data-fly>
              <h3>{plan.title}</h3>
              <p>{plan.text}</p>
              <ul className="checks">
                {plan.points.map((p) => (
                  <li key={p}>
                    <Icon name="check" /> {p}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="plan__link">
                Talk about it <Icon name="arrow" />
              </Link>
            </Tilt>
          ))}
        </div>
      </section>

      {services.faq.items.length ? (
        <section className="section container split">
          <SectionHead eyebrow={services.faq.eyebrow} title={services.faq.title} />
          <Accordion items={services.faq.items} />
        </section>
      ) : null}
    </div>
  )
}

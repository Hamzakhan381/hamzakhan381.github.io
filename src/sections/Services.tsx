import { services } from '../lib/content'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'

export function Services() {
  return (
    <section id="services" data-station className="section services">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow" data-depth>Services</p>
          <h2 className="heading" data-depth>
            What I <span className="text-gradient">build</span>
          </h2>
          <p className="section-head__lead" data-depth>
            Six disciplines, one goal: software that's reliable on day one and still easy to change on day one thousand.
          </p>
        </header>
        <ul className="services__grid">
          {services.map((s, i) => (
            <li key={s.title} data-fly>
              <Tilt className="card service">
                <span className="service__num">0{i + 1}</span>
                <span className="service__icon">
                  <Icon name={s.icon} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Tilt>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

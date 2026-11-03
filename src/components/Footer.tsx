import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import routes from '../lib/routes.json'
import { profile } from '../content'
import { Icon } from './Icon'

export function Socials() {
  return (
    <div className="socials">
      {profile.socials.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
          <Icon name={s.icon} />
        </a>
      ))}
    </div>
  )
}

const CLOCK_TICK_MS = 30000

/** Live time where I am, so visitors know whether a quick reply is likely. */
function LocalTime() {
  const format = () =>
    new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: profile.timeZoneId }).format(new Date())
  const [time, setTime] = useState(format)
  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])
  return <time>{time}</time>
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <Link to="/contact" className="footer__cta" data-reveal>
          <span className="footer__cta-small">Have a project in mind?</span>
          <span className="footer__cta-big">
            Let's talk <Icon name="arrowUpRight" />
          </span>
        </Link>
        <div className="footer__row">
          <nav className="footer__links" aria-label="Footer">
            {routes.map((r) => (
              <Link key={r.path} to={r.path}>
                {r.label}
              </Link>
            ))}
          </nav>
          <Socials />
        </div>
        <div className="footer__row footer__row--meta">
          <p className="footer__copy">
            © {new Date().getFullYear()} {profile.name}. Built with React, Three.js & GSAP.
          </p>
          <p className="footer__copy">
            <span className="pulse-dot" aria-hidden="true" /> <LocalTime /> in {profile.location} · {profile.timezone}
          </p>
        </div>
      </div>
    </footer>
  )
}

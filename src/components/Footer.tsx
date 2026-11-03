import { Link } from 'react-router'
import routes from '../lib/routes.json'
import { profile } from '../lib/content'
import { Icon, type IconName } from './Icon'

const socials: { icon: IconName; label: string; href: string }[] = [
  { icon: 'github', label: 'GitHub', href: profile.links.github },
  { icon: 'linkedin', label: 'LinkedIn', href: profile.links.linkedin },
  { icon: 'instagram', label: 'Instagram', href: profile.links.instagram },
]

export { socials }

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
          <div className="socials">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                <Icon name={s.icon} />
              </a>
            ))}
          </div>
        </div>
        <p className="footer__copy">
          © {new Date().getFullYear()} {profile.name}. Built with React, Three.js & GSAP.
        </p>
      </div>
    </footer>
  )
}

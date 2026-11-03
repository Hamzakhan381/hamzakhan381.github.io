import { contact, profile } from '../content'
import { scrollToId } from '../lib/scroll'
import { copyText } from '../lib/toast'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { ContactForm, CopyEmail } from '../components/ContactForm'
import { Icon, type IconName } from '../components/Icon'

const channels: { icon: IconName; label: string; value: string; href?: string; copy?: boolean }[] = [
  { icon: 'mail', label: 'Email', value: profile.email, href: `mailto:${profile.email}`, copy: true },
  { icon: 'phone', label: 'Phone', value: profile.phone, href: profile.phoneHref },
  { icon: 'pin', label: 'Location', value: `${profile.location} · ${profile.workMode}` },
  { icon: 'clock', label: 'Timezone', value: profile.timezone },
]

export default function Contact() {
  const ref = usePageEffects<HTMLDivElement>()

  return (
    <div ref={ref} className="page">
      {/* The 3D developer stays pinned beside everything inside this block. */}
      <div data-track="desk">
        <PageHero hero={contact.hero}>
          <div className="actions">
            <button type="button" className="btn" onClick={() => scrollToId('contact-form')}>
              Write a message <Icon name="arrow" />
            </button>
            <CopyEmail />
          </div>
        </PageHero>

        <section className="section container contact">
          <div className="lane">
            <ContactForm />

            <div className="card availability" data-fly>
              <p className="status">
                <span className="pulse-dot" aria-hidden="true" /> {profile.availability.label}
              </p>
              <p>{profile.availability.detail}</p>
              <p className="availability__time">
                <Icon name="clock" /> {profile.availability.responseTime}
              </p>
            </div>

            <ul className="channels">
              {channels.map((c) => (
                <li key={c.label} data-fly>
                  <span className="channels__icon">
                    <Icon name={c.icon} />
                  </span>
                  <span className="channels__text">
                    <small>{c.label}</small>
                    {c.href ? <a href={c.href}>{c.value}</a> : <span>{c.value}</span>}
                  </span>
                  {c.copy ? (
                    <button type="button" className="icon-btn icon-btn--small" aria-label={`Copy ${c.label.toLowerCase()}`} onClick={() => void copyText(c.value, `${c.label} copied to clipboard`)}>
                      <Icon name="copy" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            <ul className="social-cards">
              {profile.socials.map((s) => (
                <li key={s.label} data-fly>
                  <a className="card social-card" href={s.href} target="_blank" rel="noreferrer">
                    <Icon name={s.icon} />
                    <span>
                      <small>{s.label}</small>
                      {s.handle}
                    </span>
                    <Icon name="arrowUpRight" className="social-card__go" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

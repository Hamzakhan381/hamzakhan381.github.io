import { useState, type SyntheticEvent } from 'react'
import { profile } from '../lib/content'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon, type IconName } from '../components/Icon'
import { Tilt } from '../components/Tilt'
import { socials } from '../components/Footer'

type Status = { tone: 'idle' | 'success'; text: string }

const STATUS_RESET_MS = 5000
const FORM_TILT = 4

const channels: { icon: IconName; label: string; value: string; href?: string }[] = [
  { icon: 'mail', label: 'Email', value: profile.email, href: `mailto:${profile.email}` },
  { icon: 'phone', label: 'Phone', value: profile.phone, href: profile.phoneHref },
  { icon: 'pin', label: 'Location', value: profile.location },
]

function composeUrls(form: FormData) {
  const get = (key: string) => String(form.get(key) ?? '').trim()
  const subject = get('subject') || 'Portfolio inquiry'
  const body = `Hi Hamza,\n\nName: ${get('name')}\nEmail: ${get('email')}\n\n${get('message')}\n\n— Sent from your portfolio`
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: profile.email, su: subject, body })
  return {
    gmail: `https://mail.google.com/mail/?${params}`,
    mailto: `mailto:${profile.email}?${new URLSearchParams({ subject, body })}`,
  }
}

export default function Contact() {
  const ref = usePageEffects<HTMLDivElement>()
  const [status, setStatus] = useState<Status>({ tone: 'idle', text: '' })

  const onSubmit = (e: SyntheticEvent<HTMLElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const { gmail, mailto } = composeUrls(new FormData(form))
    // `noopener` would make window.open return null, hiding whether a popup blocker fired.
    const opened = window.open(gmail, '_blank')
    if (opened) opened.opener = null
    else window.location.href = mailto
    setStatus({ tone: 'success', text: 'Your message is ready in a new Gmail tab. Hit send there.' })
    form.reset()
    window.setTimeout(() => setStatus({ tone: 'idle', text: '' }), STATUS_RESET_MS)
  }

  return (
    <div ref={ref} className="page">
      <PageHero
        eyebrow="Contact"
        lines={["Let's build", 'something great.']}
        accent={1}
        lead="Have a project, an opportunity, or just want to talk shop? Send a message and I'll reply within 24–48 hours."
      />

      <section className="section container contact">
        <div className="contact__info">
          <ul className="channels">
            {channels.map((c) => (
              <li key={c.label} data-fly>
                <span className="channels__icon">
                  <Icon name={c.icon} />
                </span>
                <span>
                  <small>{c.label}</small>
                  {c.href ? <a href={c.href}>{c.value}</a> : <span>{c.value}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="socials" data-fly>
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                <Icon name={s.icon} />
              </a>
            ))}
          </div>
        </div>

        <Tilt as="form" className="card contact__form" max={FORM_TILT} onSubmit={onSubmit} data-fly>
          <div className="field-row">
            <label className="field">
              <span>Name</span>
              <input name="name" autoComplete="name" required placeholder="Your name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            </label>
          </div>
          <label className="field">
            <span>Subject</span>
            <input name="subject" placeholder="What's this about?" />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea name="message" rows={5} required placeholder="Tell me about your project…" />
          </label>
          <button type="submit" className="btn btn--block">
            Send message <Icon name="send" />
          </button>
          <p className={`form-status form-status--${status.tone}`} role="status" aria-live="polite">
            {status.text}
          </p>
        </Tilt>
      </section>
    </div>
  )
}

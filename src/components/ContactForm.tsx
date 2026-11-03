import { useRef, useState, type SyntheticEvent } from 'react'
import { contact, profile } from '../content'
import { deskMood, now } from '../lib/deskMood'
import { copyText, toast } from '../lib/toast'
import { Icon } from './Icon'

const NAME_MIN = 2
const MESSAGE_MIN = 10
const NEAR_LIMIT = 0.9

type FieldElement = HTMLInputElement | HTMLTextAreaElement

const asField = (target: EventTarget | null): FieldElement | null =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null

/** Turns the browser's built-in validity flags into friendly, specific messages. */
function messageFor(el: FieldElement, label: string) {
  const v = el.validity
  if (v.valid) return ''
  if (v.valueMissing) return `${label} is required.`
  if (v.typeMismatch) return "That email address doesn't look right."
  if (v.tooShort) return `Please write at least ${el.minLength} characters.`
  return el.validationMessage
}

function composeUrls(form: FormData) {
  const get = (key: string) => String(form.get(key) ?? '').trim()
  const subject = [get('topic'), get('subject')].filter(Boolean).join(': ') || 'Portfolio inquiry'
  const body = `Hi ${profile.firstName},\n\nName: ${get('name')}\nEmail: ${get('email')}\n\n${get('message')}\n\n— Sent from your portfolio`
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: profile.email, su: subject, body })
  return {
    gmail: `https://mail.google.com/mail/?${params}`,
    mailto: `mailto:${profile.email}?${new URLSearchParams({ subject, body })}`,
  }
}

export function CopyEmail({ className = 'btn btn--ghost' }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => void copyText(profile.email, 'Email copied to clipboard')}>
      <Icon name="copy" /> Copy email
    </button>
  )
}

export function ContactForm() {
  const form = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [length, setLength] = useState(0)
  const [sent, setSent] = useState(false)

  const check = (el: FieldElement) => {
    const label = el.dataset.label ?? el.name
    setErrors((prev) => ({ ...prev, [el.name]: messageFor(el, label) }))
  }

  const onInput = (e: SyntheticEvent<HTMLFormElement>) => {
    deskMood.typedAt = now()
    const el = asField(e.target)
    if (!el) return
    if (el.name === 'message') setLength(el.value.length)
    if (errors[el.name]) check(el)
  }

  const onBlur = (e: SyntheticEvent<HTMLFormElement>) => {
    deskMood.focused = false
    const el = asField(e.target)
    if (el?.dataset.label && el.value) check(el)
  }

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const el = form.current
    if (!el) return
    const fields = Array.from(el.querySelectorAll<FieldElement>('[data-label]'))
    const found = Object.fromEntries(fields.map((f) => [f.name, messageFor(f, f.dataset.label ?? f.name)]))
    setErrors(found)
    const firstBad = fields.find((f) => found[f.name])
    if (firstBad) {
      firstBad.focus()
      return
    }
    const { gmail, mailto } = composeUrls(new FormData(el))
    // `noopener` would make window.open return null, hiding whether a popup blocker fired.
    const opened = window.open(gmail, '_blank')
    if (opened) opened.opener = null
    else window.location.href = mailto
    deskMood.sentAt = now()
    toast('Gmail opened with your message')
    setSent(true)
  }

  const reset = () => {
    form.current?.reset()
    setLength(0)
    setErrors({})
    setSent(false)
  }

  const field = (name: string) => ({
    name,
    'aria-invalid': Boolean(errors[name]) || undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })
  const error = (name: string) =>
    errors[name] ? (
      <span className="field__error" id={`${name}-error`}>
        {errors[name]}
      </span>
    ) : null

  if (sent) {
    return (
      <div className="card contact__form contact__sent" role="status">
        <span className="sent__badge" aria-hidden="true">
          <Icon name="check" />
        </span>
        <h2 className="contact__title">{contact.sent.title}</h2>
        <p>{contact.sent.text}</p>
        <div className="actions">
          <button type="button" className="btn" onClick={reset}>
            Write another
          </button>
          <CopyEmail />
        </div>
      </div>
    )
  }

  return (
    <form
      ref={form}
      id="contact-form"
      className="card contact__form"
      noValidate
      onSubmit={onSubmit}
      onInput={onInput}
      onFocus={() => (deskMood.focused = true)}
      onBlur={onBlur}
      data-fly
    >
      <h2 className="contact__title">{contact.formTitle}</h2>
      <fieldset className="topics">
        <legend>What's it about?</legend>
        {contact.subjects.map((s, i) => (
          <label key={s} className="topic">
            <input type="radio" name="topic" value={s} defaultChecked={i === 0} />
            <span>{s}</span>
          </label>
        ))}
      </fieldset>
      <div className="field-row">
        <label className="field">
          <span>Name</span>
          <input {...field('name')} data-label="Your name" autoComplete="name" required minLength={NAME_MIN} placeholder="Your name" />
          {error('name')}
        </label>
        <label className="field">
          <span>Email</span>
          <input {...field('email')} data-label="Your email" type="email" autoComplete="email" required placeholder="you@example.com" />
          {error('email')}
        </label>
      </div>
      <label className="field">
        <span>Subject</span>
        <input name="subject" placeholder="A few words (optional)" />
      </label>
      <label className="field">
        <span className="field__head">
          Message
          <small className={length > contact.messageLimit * NEAR_LIMIT ? 'is-near' : ''}>
            {length} / {contact.messageLimit}
          </small>
        </span>
        <textarea
          {...field('message')}
          data-label="A message"
          rows={5}
          required
          minLength={MESSAGE_MIN}
          maxLength={contact.messageLimit}
          placeholder="Tell me about your project…"
        />
        {error('message')}
      </label>
      <button type="submit" className="btn btn--block">
        Send message <Icon name="send" />
      </button>
      <p className="form-note">Opens Gmail with your message filled in. Nothing is stored on this site.</p>
    </form>
  )
}

import type { ReactNode } from 'react'
import { Icon } from './Icon'

type HeadProps = { eyebrow: string; title: string; accent?: string; lead?: ReactNode; center?: boolean }

/** Eyebrow + title (+ optional accent phrase and lead) with the page's scroll-depth reveal. */
export function SectionHead({ eyebrow, title, accent, lead, center = false }: HeadProps) {
  return (
    <header className={`section-head ${center ? 'section-head--center' : ''}`}>
      <p className="eyebrow" data-reveal>
        {eyebrow}
      </p>
      <h2 className="heading" data-reveal>
        {title} {accent ? <span className="accent">{accent}</span> : null}
      </h2>
      {lead ? (
        <p className="section-head__lead" data-reveal>
          {lead}
        </p>
      ) : null}
    </header>
  )
}

/** Native <details> FAQ, so it works without JavaScript and with the keyboard. */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="accordion">
      {items.map((item) => (
        <details key={item.q} className="accordion__item card" data-fly>
          <summary>
            {item.q}
            <span className="accordion__icon" aria-hidden="true">
              <Icon name="plus" />
            </span>
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}

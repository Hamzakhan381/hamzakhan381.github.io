import type { ReactNode } from 'react'
import { SplitText } from './SplitText'

type PageHeroProps = {
  eyebrow: string
  /** Title lines; the line at `accent` is drawn in the accent colour. */
  lines: string[]
  accent?: number
  lead?: ReactNode
  children?: ReactNode
  className?: string
}

export function PageHero({ eyebrow, lines, accent = -1, lead, children, className = '' }: PageHeroProps) {
  return (
    <header className={`page-hero container ${className}`}>
      <p className="eyebrow" data-intro>
        {eyebrow}
      </p>
      <h1 className="page-hero__title">
        {lines.map((line, i) => (
          <SplitText key={line} text={line} className={i === accent ? 'accent' : ''} />
        ))}
      </h1>
      {lead ? (
        <p className="page-hero__lead" data-intro>
          {lead}
        </p>
      ) : null}
      {children ? (
        <div className="page-hero__extra" data-intro>
          {children}
        </div>
      ) : null}
    </header>
  )
}

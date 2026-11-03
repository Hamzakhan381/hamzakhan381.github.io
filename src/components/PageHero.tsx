import type { ReactNode } from 'react'
import type { Hero } from '../content'
import { SplitText } from './SplitText'

type PageHeroProps = { hero: Hero; children?: ReactNode; className?: string }

/** Page title block: eyebrow, letter-flipping title lines (one in the accent colour), lead and extras. */
export function PageHero({ hero, children, className = '' }: PageHeroProps) {
  return (
    <header className={`page-hero container ${className}`}>
      <p className="eyebrow" data-intro>
        {hero.eyebrow}
      </p>
      <h1 className="page-hero__title">
        {hero.lines.map((line, i) => (
          <SplitText key={line} text={line} className={i === hero.accentLine ? 'accent' : ''} />
        ))}
      </h1>
      <p className="page-hero__lead" data-intro>
        {hero.lead}
      </p>
      {children ? (
        <div className="page-hero__extra" data-intro>
          {children}
        </div>
      ) : null}
    </header>
  )
}

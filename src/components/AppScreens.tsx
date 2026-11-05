import type { CSSProperties } from 'react'
import type { Project } from '../content'

/** Screenshots are captured at a 412 × 915 phone viewport. */
const SHOT_WIDTH = 412
const SHOT_HEIGHT = 915
const FAN_SIZE = 3
const HALF = 0.5

type Variant = 'fan' | 'strip'

/**
 * A mobile project's real app screens in phone frames: a fanned trio on cards (`fan`), or every screen in a
 * row that scrolls sideways in the case study (`strip`). Renders nothing for projects without screens.
 */
export function AppScreens({ project, variant = 'fan' }: { project: Project; variant?: Variant }) {
  const screens = project.screens ?? []
  const shown = variant === 'fan' ? screens.slice(0, FAN_SIZE) : screens
  if (!shown.length) return null
  const middle = (shown.length - 1) * HALF
  return (
    <div className={`phones phones--${variant}`} aria-label={`${project.title} app screens`} role="list">
      {shown.map((screen, i) => (
        <figure
          key={screen.src}
          className="phone"
          role="listitem"
          style={{ '--d': i - middle, '--lift': Math.abs(i - middle) } as CSSProperties}
        >
          <span className="phone__frame">
            <img src={screen.src} alt={screen.alt} width={SHOT_WIDTH} height={SHOT_HEIGHT} loading="lazy" decoding="async" />
          </span>
          {variant === 'strip' ? <figcaption>{screen.alt}</figcaption> : null}
        </figure>
      ))}
    </div>
  )
}

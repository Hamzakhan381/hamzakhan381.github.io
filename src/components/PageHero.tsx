import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import type { Hero } from '../content'
import { reduceMotion, scrollState } from '../lib/scroll'
import { getQuality } from '../lib/quality'
import { SplitText } from './SplitText'

type PageHeroProps = { hero: Hero; children?: ReactNode; className?: string }

const PARALLAX_EASE = 0.08
const PARALLAX_EPSILON = 0.001
const PARALLAX_DECIMALS = 3

/**
 * Feeds the smoothed pointer position into --px / --py (-1..1) so each hero layer can drift by its own
 * depth (see .page-hero in styles.css). Fine pointers on the high tier only, and only while the hero is in view.
 */
function usePointerParallax() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion || getQuality() !== 'high' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let x = 0
    let y = 0
    const tick = () => {
      if (window.scrollY > window.innerHeight) return
      const nx = x + (scrollState.pointerX - x) * PARALLAX_EASE
      const ny = y + (scrollState.pointerY - y) * PARALLAX_EASE
      if (Math.abs(nx - x) + Math.abs(ny - y) < PARALLAX_EPSILON) return
      x = nx
      y = ny
      el.style.setProperty('--px', x.toFixed(PARALLAX_DECIMALS))
      el.style.setProperty('--py', y.toFixed(PARALLAX_DECIMALS))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
  return ref
}

/** Page title block: eyebrow, letter-flipping title lines (one in the accent colour), lead and extras. */
export function PageHero({ hero, children, className = '' }: PageHeroProps) {
  const ref = usePointerParallax()
  return (
    <header ref={ref} className={`page-hero container ${className}`}>
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

import { Fragment, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/scroll'
import { primeTransforms } from '../lib/reveal'
import motion from '../lib/motion.json'

const R = motion.roll

/**
 * Text whose letters roll up into place in 3D as it scrolls into view, one after another (words stay together when
 * wrapping). Hidden from assistive tech: give the surrounding heading an aria-label with the full text.
 */
export function RollText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')

  // Set up just after the first paint (not inside the commit), so it never holds up a page switch: this sits
  // below the fold when a page opens.
  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion) return
    const chars = Array.from(el.querySelectorAll('.roll-char'))
    primeTransforms(chars)
    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { rotateX: R.roll, yPercent: R.lift, opacity: 0, transformPerspective: motion.perspective, transformOrigin: '50% 100%' },
        { rotateX: 0, yPercent: 0, opacity: 1, stagger: R.stagger, ease: 'power2.out', scrollTrigger: { trigger: el, start: R.start, end: R.end, scrub: true } },
      )
    }, el)
    return () => ctx.revert()
  }, [text])

  return (
    <span ref={ref} className={`roll ${className}`} aria-hidden="true">
      {words.map((word, w) => (
        <Fragment key={`${word}-${w}`}>
          <span className="roll-word">
            {Array.from(word).map((ch, c) => (
              <span key={`${ch}-${c}`} className="roll-char">
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import motion from '../lib/motion.json'

const H = motion.journey.hud
const INDEX_DIGITS = 2
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')

/**
 * A heads-up readout in the corner of the Home page: which step of the journey you're on ("02 / 04 experience")
 * over a thin progress bar for the whole page. Steps are the page's `[data-step]` sections, in order. Rendered
 * into <body> because the page wrapper has a perspective, which would pin a fixed element to the page instead.
 */
export function JourneyHud({ labels }: { labels: string[] }) {
  const [step, setStep] = useState(0)
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('#main [data-step]'))
    const triggers = sections.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: H.line,
        end: `bottom ${H.line.split(' ')[1]}`,
        onToggle: (self) => {
          if (self.isActive) setStep(i)
        },
      }),
    )
    const progress = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => bar.current?.style.setProperty('--p', self.progress.toFixed(H.decimals)),
    })
    return () => [...triggers, progress].forEach((t) => t.kill())
  }, [labels])

  return createPortal(
    <div className="jhud" aria-hidden="true">
      <span className="jhud__count">
        <strong>{pad(step)}</strong> / {pad(labels.length - 1)}
      </span>
      <span className="jhud__label">{labels[step]}</span>
      <span ref={bar} className="jhud__bar" />
    </div>,
    document.body,
  )
}

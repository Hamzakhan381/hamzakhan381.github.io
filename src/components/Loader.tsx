import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { profile } from '../lib/content'

const PERCENT = 100
const CREEP_LIMIT = 86
const CREEP_MS = 40
const EXIT_DURATION = 1.1
const FADE_DURATION = 0.55
const EXIT_SCALE = 0.9
const COUNTER_DIGITS = 3

/** Branded loading veil: creeps toward 86% while the scene compiles, then completes and lifts away. */
export function Loader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (ready) return
    const id = window.setInterval(() => setProgress((p) => (p < CREEP_LIMIT ? p + 1 : p)), CREEP_MS)
    return () => window.clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (!ready || !ref.current) return
    setProgress(PERCENT)
    const tl = gsap.timeline({ onComplete: () => setGone(true) })
    tl.to(ref.current.querySelector('.loader__inner'), { scale: EXIT_SCALE, opacity: 0, duration: FADE_DURATION, ease: 'power2.in' })
    tl.to(ref.current, { clipPath: 'inset(0 0 100% 0)', duration: EXIT_DURATION, ease: 'expo.inOut' }, '<0.1')
    tl.call(onDone, [], '<0.35')
    return () => {
      tl.kill()
    }
  }, [ready, onDone])

  if (gone) return null
  return (
    <div ref={ref} className="loader" role="status" aria-label="Loading portfolio">
      <div className="loader__inner">
        <div className="loader__cube" aria-hidden="true">
          {['front', 'back', 'left', 'right', 'top', 'bottom'].map((face) => (
            <span key={face} className={`loader__face loader__face--${face}`} />
          ))}
        </div>
        <p className="loader__name">{profile.short}</p>
        <div className="loader__bar">
          <span style={{ transform: `scaleX(${progress / PERCENT})` }} />
        </div>
        <p className="loader__pct">{String(progress).padStart(COUNTER_DIGITS, '0')}</p>
      </div>
    </div>
  )
}

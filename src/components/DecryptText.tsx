import { Fragment, useEffect, useMemo, useRef } from 'react'
import { appLoaded } from '../lib/intro'
import { reduceMotion } from '../lib/scroll'
import { MS_PER_SECOND } from '../lib/math'
import motion from '../lib/motion.json'

const D = motion.journey.decrypt
const GLYPHS = '!<>-_/[]{}=+*^?#$%&01'
const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Text that decrypts itself: every letter starts as a random code glyph and settles into place, left to right.
 * Each letter is laid out at its final width (the real letter sits underneath, transparent, with the glyph drawn
 * over it), so nothing shifts while it scrambles. Hover to scramble it again. Letters are `.dx` spans, so the
 * Home page can also fling them apart in 3D.
 */
export function DecryptText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const running = useRef(false)
  // Letters are grouped per word so a long name wraps between words, never inside one.
  const words = useMemo(() => text.split(' ').map((word) => Array.from(word).map((ch) => ({ ch, glyph: randomGlyph() }))), [text])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const chars = Array.from(root.querySelectorAll<HTMLElement>('.dx'))
    let frame = 0
    let cancelled = false

    const run = () => {
      if (running.current || cancelled) return
      running.current = true
      const start = performance.now()
      const settleAt = chars.map((_, i) => (i * D.stagger + Math.random() * D.jitter) * MS_PER_SECOND)
      let lastFlicker = 0
      chars.forEach((c) => c.classList.remove('is-done'))
      const tick = (now: number) => {
        const elapsed = now - start
        const flicker = now - lastFlicker > D.flickerMs
        if (flicker) lastFlicker = now
        const pending = chars.filter((c, i) => {
          if (elapsed >= settleAt[i]) {
            c.classList.add('is-done')
            return false
          }
          if (flicker) c.setAttribute('data-g', randomGlyph())
          return true
        })
        if (pending.length && !cancelled) frame = requestAnimationFrame(tick)
        else running.current = false
      }
      frame = requestAnimationFrame(tick)
    }

    if (reduceMotion) {
      chars.forEach((c) => c.classList.add('is-done'))
      return
    }
    const begin = async () => {
      await appLoaded
      window.setTimeout(run, D.delay * MS_PER_SECOND)
    }
    void begin()
    const again = () => run()
    if (canHover) root.addEventListener('pointerenter', again)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      root.removeEventListener('pointerenter', again)
    }
  }, [words])

  return (
    <span ref={ref} className={`decrypt ${className}`} aria-hidden="true">
      {words.map((word, w) => (
        <Fragment key={w}>
          <span className="dx-word">
            {word.map(({ ch, glyph }, i) => (
              <span key={i} className="dx" data-g={glyph}>
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

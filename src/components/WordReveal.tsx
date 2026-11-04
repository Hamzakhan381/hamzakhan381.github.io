import { useLayoutEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'

const W = motion.journey.words
type Word = { text: string; hot: boolean }

/** Splits "I build [web apps] fast" into words, marking the ones inside [brackets] as highlighted. */
function parse(text: string): Word[] {
  return text.split('[').flatMap((chunk, i) => {
    const [inside, after = ''] = i ? chunk.split(']') : ['', chunk]
    const words = (s: string, hot: boolean) =>
      s
        .split(' ')
        .filter(Boolean)
        .map((w) => ({ text: w, hot }))
    return [...words(inside, true), ...words(after, false)]
  })
}

/**
 * A paragraph that lights up one word at a time as you scroll through it; the [bracketed] words light up in the
 * accent colour. It is ordinary text underneath, so it reads fine without JavaScript or with reduced motion.
 */
export function WordReveal({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const words = useMemo(() => parse(text), [text])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduceMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.word'),
        { opacity: W.from },
        { opacity: 1, ease: 'none', stagger: W.stagger, scrollTrigger: { trigger: el, start: W.start, end: W.end, scrub: true } },
      )
    }, el)
    return () => ctx.revert()
  }, [words])

  return (
    <p ref={ref} className={`words ${className}`}>
      {words.map((w, i) => (
        <span key={`${w.text}-${i}`} className={w.hot ? 'word word--hot' : 'word'}>
          {w.text}{' '}
        </span>
      ))}
    </p>
  )
}

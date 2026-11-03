import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'

export type Token = { text: string; kind?: 'kw' | 'key' | 'str' | 'bool' | 'com' | 'fn' | 'type' }
export type CodeLine = Token[]

/** An editor window whose lines slide in one by one as it scrolls into view. */
export function CodeWindow({ filename, lines }: { filename: string; lines: CodeLine[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduceMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.code__line'),
        { opacity: 0, x: -motion.code.x, rotateY: -motion.code.rotateY, transformPerspective: motion.perspective },
        {
          opacity: 1,
          x: 0,
          rotateY: 0,
          stagger: motion.code.stagger,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 45%', scrub: motion.scrub },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} className="code card">
      <div className="code__bar">
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="code__tab">{filename}</span>
      </div>
      <pre className="code__body">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="code__line">
              <span className="code__num" aria-hidden="true">
                {i + 1}
              </span>
              {line.map((token, k) => (
                <span key={k} className={token.kind ? `tok-${token.kind}` : undefined}>
                  {token.text}
                </span>
              ))}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

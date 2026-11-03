import { useLayoutEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../lib/scroll'
import { clamp } from '../lib/math'
import type { TerminalStep } from '../content'

type Line = { kind: 'cmd' | 'out'; text: string }

/** A shell session that types itself out as you scroll through it (scrubbed, so scrolling back un-types it). */
export function Terminal({ host, session }: { host: string; session: TerminalStep[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const lines = useMemo<Line[]>(
    () => session.flatMap((step) => [{ kind: 'cmd' as const, text: step.cmd }, ...step.out.map((text) => ({ kind: 'out' as const, text }))]),
    [session],
  )
  /** Character offset at which each line starts; the last entry is the total length. */
  const starts = useMemo(
    () => lines.reduce<number[]>((acc, line) => [...acc, acc[acc.length - 1] + line.text.length], [0]),
    [lines],
  )
  const total = starts[starts.length - 1]

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-row]'))
    const render = (progress: number) => {
      const typed = Math.round(progress * total)
      const typingRow = starts.findIndex((start, i) => i > 0 && typed < start) - 1
      const caretRow = typingRow < 0 ? lines.length - 1 : typingRow
      lines.forEach((line, i) => {
        const shown = clamp(typed - starts[i], 0, line.text.length)
        const row = rows[i]
        const text = row.querySelector<HTMLElement>('[data-text]')
        if (text) text.textContent = line.text.slice(0, shown)
        // A prompt appears as soon as the previous line finishes; output lines appear with their first character.
        const reached = typed >= starts[i] && (shown > 0 || line.kind === 'cmd')
        row.dataset.state = reached ? 'shown' : 'hidden'
        row.classList.toggle('has-caret', i === caretRow)
      })
    }
    if (prefersReducedMotion) {
      render(1)
      return
    }
    const ctx = gsap.context(() => {
      gsap.to(
        {},
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            end: 'bottom 30%',
            scrub: true,
            onUpdate: (self) => render(self.progress),
          },
        },
      )
    }, el)
    render(0)
    return () => ctx.revert()
  }, [lines, starts, total])

  return (
    <div ref={ref} className="term card" role="img" aria-label={`Terminal session: ${lines.map((l) => l.text).join('. ')}`}>
      <div className="term__bar" aria-hidden="true">
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__title">{host}: ~</span>
      </div>
      <div className="term__body" aria-hidden="true">
        {lines.map((line, i) => (
          <div key={i} data-row className={`term__line term__line--${line.kind}`} data-state="hidden">
            {line.kind === 'cmd' ? <span className="term__prompt">{host}:~$ </span> : null}
            <span data-text />
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'

const T = motion.journey.type

/**
 * Types each phrase, holds it, erases it and moves on, like someone at a prompt. Pauses while off screen; with
 * reduced motion it just shows the first phrase.
 */
export function TypeCycle({ words }: { words: string[] }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion || words.length < 1) return
    let word = 0
    let length = words[0].length
    let erasing = false
    let timer = 0
    let visible = true

    const step = () => {
      timer = 0
      if (!visible) return
      if (erasing) length -= 1
      else length += 1
      if (erasing && length <= 0) {
        erasing = false
        word = (word + 1) % words.length
        length = 0
      }
      el.textContent = words[word].slice(0, length)
      const full = !erasing && length >= words[word].length
      if (full) {
        erasing = true
        schedule(T.holdMs)
        return
      }
      schedule(erasing ? T.eraseMs : T.typeMs)
    }
    const schedule = (ms: number) => {
      timer = window.setTimeout(step, ms)
    }

    const watch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !timer) schedule(T.typeMs)
    })
    watch.observe(el)
    erasing = true
    schedule(T.holdMs)
    return () => {
      watch.disconnect()
      window.clearTimeout(timer)
    }
  }, [words])

  return (
    <span className="type-cycle">
      <span ref={ref}>{words[0]}</span>
      <span className="caret" aria-hidden="true" />
    </span>
  )
}

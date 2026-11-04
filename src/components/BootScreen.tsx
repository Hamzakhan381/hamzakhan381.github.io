import { useEffect } from 'react'
import { home } from '../content'
import motion from '../lib/motion.json'

const B = motion.boot
const MS_PER_SECOND = 1000
const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * Drives the boot intro that index.html paints before any JavaScript loads (#boot): the developer keeps typing
 * until the app is ready (and for at least a moment), then looks up, waves and says hi, and the view dives into
 * his laptop to reveal the page. Every step is a CSS class, so the animation stays on the compositor while the
 * page boots underneath. Any key, click, tap or scroll skips ahead.
 */
export function BootScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const boot = document.getElementById('boot')
    if (!boot) {
      onDone()
      return
    }
    const setText = (key: string, value: string) => {
      const el = boot.querySelector(`[data-boot="${key}"]`)
      if (el) el.textContent = value
    }
    setText('hello', home.boot.hello)
    setText('line', home.boot.line)

    const timers: number[] = []
    const after = (seconds: number, run: () => void) => timers.push(window.setTimeout(run, seconds * MS_PER_SECOND))
    let leaving = false

    const leave = (skipped: boolean) => {
      if (leaving) return
      leaving = true
      boot.classList.add(skipped ? 'is-skipping' : 'is-leaving')
      // The page intro starts now, under the fading veil.
      onDone()
      after(skipped ? B.skipExit : B.exit, () => {
        boot.remove()
        document.documentElement.classList.remove('boot')
      })
    }

    const wave = () => {
      setText('ready', `ready in ${Math.round(performance.now())} ms`)
      boot.classList.add('is-waving')
      after(B.wave, () => leave(false))
    }

    // performance.now() is the time since navigation started, i.e. how long he has already been typing.
    after(Math.max(0, B.minTyping - performance.now() / MS_PER_SECOND), wave)
    const skip = () => leave(true)
    SKIP_EVENTS.forEach((type) => window.addEventListener(type, skip, { passive: true }))
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip))
    }
  }, [onDone])

  return null
}

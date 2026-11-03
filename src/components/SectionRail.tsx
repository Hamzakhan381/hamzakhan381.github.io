import { useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollToId, scrollToTopSmooth } from '../lib/scroll'
import { useMediaQuery } from '../lib/useMediaQuery'

type Mark = { id: string; label: string }
type Target = Mark & { el: HTMLElement }

const MIN_MARKS = 3
/** A section counts as current once its top passes this fraction of the screen height. */
const ACTIVE_LINE = 0.4
const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789 '
const INTRO = { id: '', label: 'Intro' }

const slug = (text: string) =>
  Array.from(text.toLowerCase())
    .filter((ch) => SLUG_CHARS.includes(ch))
    .join('')
    .split(' ')
    .filter(Boolean)
    .join('-')

/** Every section on the page that has a heading eyebrow, labelled by it; sections without an id get one. */
function findSections(): Target[] {
  const hero = document.querySelector<HTMLElement>('#main .page-hero')
  const sections = Array.from(document.querySelectorAll<HTMLElement>('#main .section-head .eyebrow')).flatMap((eyebrow) => {
    const el = eyebrow.closest<HTMLElement>('section')
    const label = eyebrow.textContent?.trim() ?? ''
    if (!el || !label) return []
    if (!el.id) el.id = `s-${slug(label)}`
    return [{ id: el.id, label, el }]
  })
  return hero ? [{ ...INTRO, el: hero }, ...sections] : sections
}

/** "On this page" dots down the right edge on wide screens: hover for the section name, click to fly there. */
export function SectionRail() {
  const wide = useMediaQuery('(min-width: 1100px)')
  const [marks, setMarks] = useState<Mark[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const main = document.getElementById('main')
    if (!wide || !main) return
    let targets: Target[] = []
    let tops: number[] = []

    // Offsets are cached and re-measured only on layout changes, so scrolling never forces a layout.
    const measure = () => {
      tops = targets.map((t) => t.el.getBoundingClientRect().top + window.scrollY)
    }
    // Scroll events already arrive at most once per frame, and this is a handful of comparisons.
    const update = () => {
      const line = window.scrollY + window.innerHeight * ACTIVE_LINE
      setActive(tops.reduce((current, top, i) => (top <= line ? i : current), 0))
    }
    const onRefresh = () => {
      measure()
      update()
    }
    const scan = () => {
      targets = findSections()
      setMarks(targets.map(({ id, label }) => ({ id, label })))
      onRefresh()
    }

    scan()
    // A new page replaces #main's children; rescan then.
    const observer = new MutationObserver(scan)
    observer.observe(main, { childList: true })
    ScrollTrigger.addEventListener('refresh', onRefresh)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      window.removeEventListener('scroll', update)
    }
  }, [wide])

  if (!wide || marks.length < MIN_MARKS) return null

  return (
    <nav className="section-rail" aria-label="On this page">
      <ol>
        {marks.map((mark, i) => (
          <li key={mark.id || 'intro'}>
            <button
              type="button"
              className={i === active ? 'is-active' : ''}
              aria-current={i === active ? 'location' : undefined}
              onClick={() => (mark.id ? scrollToId(mark.id) : scrollToTopSmooth())}
            >
              <span className="section-rail__label">{mark.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

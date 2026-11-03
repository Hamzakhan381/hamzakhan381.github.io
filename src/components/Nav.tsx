import { useEffect, useState } from 'react'
import { nav, profile } from '../lib/content'
import { scrollToId } from '../lib/scroll'
import { Icon } from './Icon'

const ACTIVE_ROOT_MARGIN = '-45% 0px -50% 0px'

export function Nav() {
  const [active, setActive] = useState<string>('home')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting)
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: ACTIVE_ROOT_MARGIN },
    )
    nav.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (id: string) => {
    setOpen(false)
    scrollToId(id)
  }

  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
      <header className="nav">
        <a
          href="#home"
          className="nav__logo"
          onClick={(e) => {
            e.preventDefault()
            go('home')
          }}
          aria-label={`${profile.name}, back to top`}
        >
          <span className="nav__mark">MH</span>
          <span className="nav__name">Hamza Khan</span>
        </a>

        <nav aria-label="Primary">
          <ul className="nav__links">
            {nav.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={active === id ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    go(id)
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href={profile.links.resume} className="btn btn--small nav__cta">
          <Icon name="file" /> Resume
        </a>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </header>

      <div id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <ul>
          {nav.map(({ id, label }, i) => (
            <li key={id} style={{ '--i': i } as React.CSSProperties}>
              <a
                href={`#${id}`}
                tabIndex={open ? 0 : -1}
                onClick={(e) => {
                  e.preventDefault()
                  go(id)
                }}
              >
                <span className="mobile-menu__num">0{i + 1}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <a href={profile.links.resume} className="btn" tabIndex={open ? 0 : -1}>
          <Icon name="file" /> View Resume
        </a>
      </div>
    </>
  )
}

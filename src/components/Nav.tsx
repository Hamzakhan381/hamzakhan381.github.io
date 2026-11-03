import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import routes from '../lib/routes.json'
import { profile } from '../content'
import { toggleTheme, useTheme } from '../lib/theme'
import { lockScroll } from '../lib/scroll'
import { OPEN_PALETTE, isMac } from './CommandPalette'
import { Icon } from './Icon'

const HALF = 0.5
const HIDE_AFTER_PX = 140
const SCROLLED_PX = 24
const MIN_DELTA_PX = 6
const menuRoutes = routes.filter((r) => r.path !== '/cv')

function ThemeToggle() {
  const theme = useTheme()
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    toggleTheme(left + width * HALF, top + height * HALF)
  }
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onClick}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title="Toggle theme"
    >
      <span className="theme-toggle__cube" data-theme-face={theme}>
        <Icon name="moon" className="theme-toggle__face theme-toggle__face--dark" />
        <Icon name="sun" className="theme-toggle__face theme-toggle__face--light" />
      </span>
    </button>
  )
}

/** Hides the bar while scrolling down (more room to read) and brings it back on any scroll up. */
function useAutoHide(pinned: boolean) {
  const header = useRef<HTMLElement>(null)
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const el = header.current
      if (!el) return
      const y = window.scrollY
      const delta = y - last
      el.classList.toggle('nav--scrolled', y > SCROLLED_PX)
      if (Math.abs(delta) < MIN_DELTA_PX) return
      el.classList.toggle('nav--hidden', !pinned && delta > 0 && y > HIDE_AFTER_PX && !el.contains(document.activeElement))
      last = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pinned])
  return header
}

export function Nav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const header = useAutoHide(open)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    lockScroll('menu', open)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
      <header ref={header} className="nav">
        <Link to="/" className="nav__logo" aria-label={`${profile.name}, home`}>
          <span className="nav__mark">HK</span>
          <span className="nav__name">Hamza Khan</span>
        </Link>

        <nav aria-label="Primary">
          <ul className="nav__links">
            {menuRoutes.map((r) => (
              <li key={r.path}>
                <NavLink to={r.path} end={r.path === '/'}>
                  {r.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="nav__cmd"
          onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}
          aria-label="Open command palette"
          title="Command palette"
        >
          <Icon name="search" />
          <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <ThemeToggle />
        <NavLink to="/cv" className="btn btn--small nav__cta">
          <Icon name="file" /> CV
        </NavLink>
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

      <div id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
        <ul>
          {routes.map((r, i) => (
            <li key={r.path} style={{ '--i': i } as CSSProperties}>
              <NavLink to={r.path} end={r.path === '/'}>
                <span className="mobile-menu__num">0{i + 1}</span>
                {r.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { profile } from '../content'
import { Icon, type IconName } from './Icon'

type Face = { id: string; label: string; icon: IconName; href: string; internal?: boolean }

/** Face order around the cube; the tour in styles.css (@keyframes cube-tour) visits them in this order. */
const SIDES = ['front', 'right', 'back', 'left', 'top', 'bottom'] as const
type Side = (typeof SIDES)[number]

const links: Face[] = [
  { id: 'email', label: 'Email', icon: 'mail', href: `mailto:${profile.email}` },
  ...profile.socials.map((s): Face => ({ id: s.label, label: s.label, icon: s.icon, href: s.href })),
  { id: 'cv', label: 'CV', icon: 'file', href: '/cv', internal: true },
  { id: 'contact', label: 'Say hi', icon: 'send', href: '/contact', internal: true },
]
const faces = links.slice(0, SIDES.length)

/**
 * A CSS 3D cube of contact links that tours its faces. Hovering pauses it, keyboard focus turns the
 * focused face forward, and it only animates while on screen.
 */
export function SocialCube() {
  const scene = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState<Side | null>(null)

  useEffect(() => {
    const el = scene.current
    if (!el) return
    const watcher = new IntersectionObserver(([entry]) => el.classList.toggle('is-visible', entry.isIntersecting))
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])

  return (
    <div ref={scene} className="cube-scene">
      <div className="cube-tilt">
        <div className="cube" data-face={focused ?? undefined}>
          {SIDES.map((side, i) => {
            const face = faces[i]
            const className = `cube__face cube__face--${side}`
            if (!face)
              return (
                <span key={side} className={className} aria-hidden="true">
                  {profile.initials}
                </span>
              )
            const content = (
              <>
                <Icon name={face.icon} />
                <span>{face.label}</span>
              </>
            )
            const focusProps = { onFocus: () => setFocused(side), onBlur: () => setFocused(null) }
            return face.internal ? (
              <Link key={side} to={face.href} className={className} {...focusProps}>
                {content}
              </Link>
            ) : (
              <a
                key={side}
                href={face.href}
                className={className}
                target={face.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                {...focusProps}
              >
                {content}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

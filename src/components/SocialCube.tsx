import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { profile } from '../content'
import { Icon, type IconName } from './Icon'

type Face = { label: string; icon: IconName }

/** Face order around the cube; the tour in styles.css (@keyframes cube-tour) visits them in this order. */
const SIDES = ['front', 'right', 'back', 'left', 'top', 'bottom'] as const

const faces: Face[] = [
  { label: 'Say hi', icon: 'send' },
  ...profile.socials.map((s): Face => ({ label: s.label, icon: s.icon })),
  { label: 'Email', icon: 'mail' },
  { label: 'CV', icon: 'file' },
]

/**
 * A CSS 3D cube that tours the ways to reach me. The whole cube is one link to the contact page (single faces
 * would overlap as it turns, making them hard to hit); hovering pauses it, and it only animates while on screen.
 */
export function SocialCube() {
  const scene = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = scene.current
    if (!el) return
    const watcher = new IntersectionObserver(([entry]) => el.classList.toggle('is-visible', entry.isIntersecting))
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])

  return (
    <Link ref={scene} to="/contact" className="cube-scene" aria-label="Get in touch">
      <span className="cube-tilt" aria-hidden="true">
        <span className="cube">
          {SIDES.map((side, i) => {
            const face = faces[i]
            return (
              <span key={side} className={`cube__face cube__face--${side} ${face ? '' : 'cube__face--mono'}`}>
                {face ? (
                  <>
                    <Icon name={face.icon} />
                    <span>{face.label}</span>
                  </>
                ) : (
                  profile.initials
                )}
              </span>
            )
          })}
        </span>
      </span>
    </Link>
  )
}

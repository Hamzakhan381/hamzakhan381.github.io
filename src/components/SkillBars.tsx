import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/scroll'
import motion from '../lib/motion.json'
import type { Skills } from '../content'

const PERCENT = 100

/** Skill groups with proficiency bars that fill, staggered, as each group scrolls into view. */
export function SkillBars({ groups }: { groups: Skills['groups'] }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduceMotion) return
    const ctx = gsap.context(() => {
      Array.from(el.querySelectorAll<HTMLElement>('.bars__group')).forEach((group) => {
        gsap.from(group.querySelectorAll('.bars__fill'), {
          scaleX: 0,
          duration: motion.bars.duration,
          stagger: motion.bars.stagger,
          ease: 'expo.out',
          scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        })
      })
    }, el)
    return () => ctx.revert()
  }, [groups])

  return (
    <div ref={ref} className="bars">
      {groups.map((group) => (
        <div key={group.label} className="bars__group card" data-fly>
          <h3>{group.label}</h3>
          <ul>
            {group.items.map((skill) => (
              <li key={skill.name}>
                <span className="bars__name">{skill.name}</span>
                <span className="bars__track" role="meter" aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={skill.level} aria-label={skill.name}>
                  <span className="bars__fill" style={{ '--level': skill.level / PERCENT } as CSSProperties} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

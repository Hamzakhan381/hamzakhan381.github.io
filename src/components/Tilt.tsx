import { useRef, type ElementType, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react'
import { HALF } from '../lib/math'

const MAX_TILT_DEG = 10
const PERCENT = 100
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

type TiltProps = HTMLAttributes<HTMLElement> & { as?: ElementType; max?: number; to?: string; href?: string; children: ReactNode }

/** Pointer-driven 3D tilt with a moving glare; inert on touch devices. */
export function Tilt({ as: Tag = 'div', max = MAX_TILT_DEG, className = '', children, ...rest }: TiltProps) {
  const ref = useRef<HTMLElement>(null)
  const frame = useRef(0)

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el || !canHover) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const x = (e.clientX - left) / width
    const y = (e.clientY - top) / height
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(x - HALF) * max}deg`)
      el.style.setProperty('--rx', `${(HALF - y) * max}deg`)
      el.style.setProperty('--mx', `${x * PERCENT}%`)
      el.style.setProperty('--my', `${y * PERCENT}%`)
    })
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <Tag ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>
      {children}
      <span className="tilt__glare" aria-hidden="true" />
    </Tag>
  )
}

import { useRef, type ElementType, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react'
import { HALF } from '../lib/math'

const MAX_TILT_DEG = 10
const PERCENT = 100
const AXIS_DIGITS = 3
const ANGLE_DIGITS = 2
/** Below this (degrees) the card is treated as level. */
const LEVEL_DEG = 0.01
/** The CSS `rotate` value for no tilt. */
const LEVEL = '0 0 1 0deg'

/**
 * A tilt of `rx` degrees about the horizontal axis and `ry` about the vertical one, as one CSS `rotate` (an axis and
 * an angle), which is how the individual rotate property takes a 3D rotation. For small tilts it matches rotating
 * about each axis in turn.
 */
const tiltValue = (rx: number, ry: number) => {
  const angle = Math.hypot(rx, ry)
  if (angle < LEVEL_DEG) return LEVEL
  return `${(rx / angle).toFixed(AXIS_DIGITS)} ${(ry / angle).toFixed(AXIS_DIGITS)} 0 ${angle.toFixed(ANGLE_DIGITS)}deg`
}
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
      el.style.setProperty('--tilt', tiltValue((HALF - y) * max, (x - HALF) * max))
      el.style.setProperty('--mx', `${x * PERCENT}%`)
      el.style.setProperty('--my', `${y * PERCENT}%`)
    })
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.style.setProperty('--tilt', LEVEL)
  }

  return (
    <Tag ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>
      {children}
      <span className="tilt__glare" aria-hidden="true" />
    </Tag>
  )
}

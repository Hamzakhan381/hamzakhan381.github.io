import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { reduceMotion, scrollState } from '../lib/scroll'
import { HALF, MS_PER_SECOND } from '../lib/math'
import { Icon } from './Icon'

const FULL_TURN = 360
const HALF_TURN = 180
const QUARTER_TURN = 90
const CARD_WIDTH = 330
const RING_GAP = 70
const DRAG_DEG_PER_PX = 0.22
const FLING_FRAMES = 8
const SNAP_DURATION = 0.9
const AUTO_DEG_PER_SECOND = 7
const MIN_OPACITY = 0.12
const SCENE_SPIN_PER_DEG = Math.PI / HALF_TURN
const CLICK_SLOP_PX = 6
const COUNTER_DIGITS = 2

const wrap = (deg: number) => ((((deg + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN

type Props<T> = { items: T[]; label: string; renderItem: (item: T, active: boolean) => ReactNode }

/** Cards on the wall of a rotating cylinder: drag, buttons, arrow keys or focus to turn it. */
export function Carousel3D<T>({ items, label, renderItem }: Props<T>) {
  const count = items.length
  const step = FULL_TURN / count
  const radius = Math.round((CARD_WIDTH * HALF) / Math.tan(Math.PI / count)) + RING_GAP
  const ring = useRef<HTMLUListElement>(null)
  const cards = useRef<(HTMLLIElement | null)[]>([])
  const angle = useRef({ value: 0 })
  const drag = useRef({ active: false, startX: 0, lastX: 0, velocity: 0, moved: 0 })
  const paused = useRef(false)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  const apply = useCallback(() => {
    const value = angle.current.value
    if (ring.current) ring.current.style.transform = `translateZ(${-radius}px) rotateY(${value}deg)`
    scrollState.spin = value * SCENE_SPIN_PER_DEG
    cards.current.forEach((_, i) => {
      const card = cards.current[i]
      if (!card) return
      const facing = Math.abs(wrap(i * step + value))
      card.style.opacity = String(Math.max(MIN_OPACITY, 1 - facing / HALF_TURN))
      card.style.pointerEvents = facing > QUARTER_TURN ? 'none' : ''
    })
    const front = ((Math.round(-value / step) % count) + count) % count
    if (front !== activeRef.current) {
      activeRef.current = front
      setActive(front)
    }
  }, [count, radius, step])

  const rotateTo = useCallback(
    (target: number) => {
      gsap.killTweensOf(angle.current)
      gsap.to(angle.current, {
        value: target,
        duration: reduceMotion ? 0 : SNAP_DURATION,
        ease: 'expo.out',
        onUpdate: apply,
      })
    },
    [apply],
  )

  const goTo = useCallback(
    (index: number) => {
      const current = angle.current.value
      rotateTo(current + wrap(-index * step - current))
    },
    [rotateTo, step],
  )

  const nudge = (direction: number) => rotateTo(Math.round(angle.current.value / step) * step - direction * step)

  useEffect(() => {
    apply()
    const tick = (_: number, deltaMs: number) => {
      if (paused.current || drag.current.active || reduceMotion || gsap.isTweening(angle.current)) return
      angle.current.value -= (AUTO_DEG_PER_SECOND * deltaMs) / MS_PER_SECOND
      apply()
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      gsap.killTweensOf(angle.current)
      scrollState.spin = 0
    }
  }, [apply])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    gsap.killTweensOf(angle.current)
    drag.current = { active: true, startX: e.clientX, lastX: e.clientX, velocity: 0, moved: 0 }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    const dx = e.clientX - d.lastX
    d.lastX = e.clientX
    d.velocity = dx
    d.moved = Math.abs(e.clientX - d.startX)
    if (d.moved > CLICK_SLOP_PX && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    angle.current.value += dx * DRAG_DEG_PER_PX
    apply()
  }

  const onPointerUp = () => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    const flung = angle.current.value + d.velocity * DRAG_DEG_PER_PX * FLING_FRAMES
    rotateTo(Math.round(flung / step) * step)
  }

  return (
    <div
      className="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') nudge(-1)
        if (e.key === 'ArrowRight') nudge(1)
      }}
    >
      <div
        className="carousel__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (drag.current.moved > CLICK_SLOP_PX) e.preventDefault()
        }}
      >
        <ul ref={ring} className="carousel__ring">
          {items.map((item, i) => (
            <li
              key={i}
              ref={(el) => void (cards.current[i] = el)}
              className="carousel__card"
              style={{ '--card-w': `${CARD_WIDTH}px`, transform: `rotateY(${i * step}deg) translateZ(${radius}px)` } as CSSProperties}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              onFocusCapture={() => goTo(i)}
            >
              {renderItem(item, i === active)}
            </li>
          ))}
        </ul>
      </div>
      <div className="carousel__controls">
        <button type="button" className="icon-btn" onClick={() => nudge(-1)} aria-label="Previous project">
          <Icon name="chevronLeft" />
        </button>
        <span className="carousel__count" aria-live="polite">
          {String(active + 1).padStart(COUNTER_DIGITS, '0')} / {String(count).padStart(COUNTER_DIGITS, '0')}
        </span>
        <button type="button" className="icon-btn" onClick={() => nudge(1)} aria-label="Next project">
          <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../lib/scroll'
import { DOUBLE, HALF, MS_PER_SECOND } from '../lib/math'

const GOLDEN_ANGLE = 2.399963229728653
const RADIUS_RATIO = 0.4
const AUTO_SPIN = 0.25
const DRAG_GAIN = 1.5
const FRICTION = 0.94
const MIN_SCALE = 0.55
const MIN_OPACITY = 0.18
const DEPTH_LAYERS = 100

/** A rotating sphere of tags laid out in 3D and projected each frame; drag to spin it. */
export function TagSphere({ tags, label }: { tags: string[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-tag]'))
    const points = items.map((_, i) => {
      const y = 1 - (i / Math.max(items.length - 1, 1)) * DOUBLE
      const ring = Math.sqrt(1 - y * y)
      return { x: Math.cos(GOLDEN_ANGLE * i) * ring, y, z: Math.sin(GOLDEN_ANGLE * i) * ring }
    })
    const state = { rx: 0, ry: 0, vx: 0, vy: AUTO_SPIN, dragging: false, lastX: 0, lastY: 0, visible: true }

    const draw = () => {
      const radius = root.clientWidth * RADIUS_RATIO
      const [sx, cx, sy, cy] = [Math.sin(state.rx), Math.cos(state.rx), Math.sin(state.ry), Math.cos(state.ry)]
      points.forEach((p, i) => {
        const x1 = p.x * cy + p.z * sy
        const z1 = -p.x * sy + p.z * cy
        const y2 = p.y * cx - z1 * sx
        const z2 = p.y * sx + z1 * cx
        const near = (z2 + 1) * HALF
        const el = items[i]
        el.style.transform = `translate(-50%, -50%) translate3d(${x1 * radius}px, ${y2 * radius}px, 0) scale(${MIN_SCALE + near * (1 - MIN_SCALE)})`
        el.style.opacity = String(MIN_OPACITY + near * (1 - MIN_OPACITY))
        el.style.zIndex = String(Math.round(near * DEPTH_LAYERS))
      })
    }

    const tick = (_: number, deltaMs: number) => {
      if (!state.visible || prefersReducedMotion) return
      const dt = deltaMs / MS_PER_SECOND
      if (!state.dragging) {
        state.vx *= FRICTION
        state.vy = state.vy * FRICTION + AUTO_SPIN * (1 - FRICTION)
      }
      state.rx += state.vx * dt
      state.ry += state.vy * dt
      draw()
    }

    const down = (e: PointerEvent) => {
      state.dragging = true
      state.lastX = e.clientX
      state.lastY = e.clientY
      root.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!state.dragging) return
      state.vy = (e.clientX - state.lastX) * DRAG_GAIN
      state.vx = -(e.clientY - state.lastY) * DRAG_GAIN
      state.lastX = e.clientX
      state.lastY = e.clientY
    }
    const up = () => {
      state.dragging = false
    }
    const observer = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting
    })

    draw()
    observer.observe(root)
    root.addEventListener('pointerdown', down)
    root.addEventListener('pointermove', move)
    root.addEventListener('pointerup', up)
    root.addEventListener('pointercancel', up)
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      observer.disconnect()
      root.removeEventListener('pointerdown', down)
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerup', up)
      root.removeEventListener('pointercancel', up)
    }
  }, [tags])

  return (
    <div ref={ref} className="sphere" role="list" aria-label={label}>
      {tags.map((tag) => (
        <span key={tag} className="sphere__tag" data-tag role="listitem">
          {tag}
        </span>
      ))}
    </div>
  )
}

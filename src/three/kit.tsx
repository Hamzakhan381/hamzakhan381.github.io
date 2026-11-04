import { useSyncExternalStore } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { CanvasTexture, Color, MathUtils, SRGBColorSpace } from 'three'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import config from './scene.json'
import { scrollState } from '../lib/scroll'
import { DOUBLE, HALF, clamp } from '../lib/math'

/* ---------- Palette ---------- */

export type Palette = { line: Color; accent: Color; surface: Color; dim: Color; ok: Color; hex: typeof config.palette }

const hex = config.palette
const palette: Palette = {
  line: new Color(hex.line),
  accent: new Color(hex.accent),
  surface: new Color(hex.surface),
  dim: new Color(hex.dim),
  ok: new Color(hex.ok),
  hex,
}

/** The scene colours (one shared set: the site has a single dark theme). */
export const usePalette = () => palette

/* ---------- Viewport ---------- */

export const useNarrow = () => useThree((s) => s.size.width / s.size.height < config.narrowAspect)

/** Half the visible width (world units) at `z`, so scenes can sit beside the page text whatever the window shape. */
export function useHalfWidth(z: number) {
  const aspect = useThree((s) => s.size.width / s.size.height)
  return Math.tan(MathUtils.degToRad(config.camera.fov) * HALF) * (config.camera.z - z) * aspect
}

/* ---------- Scroll tracking ---------- */

export type Track = { y: number; progress: number; present: boolean }
const ABSENT: Track = { y: 0, progress: 0, present: false }
const DOUBLE_TAN_HALF_FOV = Math.tan(MathUtils.degToRad(config.camera.fov) * HALF) * DOUBLE

/**
 * Makes a 3D object behave like `position: sticky` inside the page section marked `data-track={name}`:
 * it scrolls in with the section, stays pinned while the section fills the screen, then scrolls away.
 * `progress` runs 0→1 across the pinned stretch and drives the scene's scroll animation.
 */
export function readTrack(name: string, z: number): Track {
  const box = trackBox(name)
  if (!box) return ABSENT
  const vh = window.innerHeight
  const top = box.top - scrollState.y
  const bottom = top + box.height
  const worldPerPx = (DOUBLE_TAN_HALF_FOV * (config.camera.z - z)) / vh
  const pinnedSpan = Math.max(box.height - vh, 1)
  const progress = clamp(-top / pinnedSpan, 0, 1)
  const y = top > 0 ? -top * worldPerPx : Math.max(vh - bottom, 0) * worldPerPx
  return { y, progress, present: true }
}

type TrackBox = { el: Element; top: number; height: number }
const trackBoxes = new Map<string, TrackBox>()

// Section positions are measured once and reused every frame: measuring per frame would force a layout whenever
// a scroll animation has just written styles. Every layout change ends in a ScrollTrigger refresh, so drop the
// cache then (and on resize) and measure again on the next read.
const forgetTracks = () => trackBoxes.clear()
ScrollTrigger.addEventListener('refresh', forgetTracks)
window.addEventListener('resize', forgetTracks, { passive: true })

function trackBox(name: string) {
  const cached = trackBoxes.get(name)
  if (cached?.el.isConnected) return cached
  const el = document.querySelector(`[data-track="${name}"]`)
  if (!el) return undefined
  const rect = el.getBoundingClientRect()
  const box = { el, top: rect.top + window.scrollY, height: rect.height }
  trackBoxes.set(name, box)
  return box
}

/* ---------- Text labels ---------- */

const LABEL_FONT_PX = 96
const LABEL_PAD = 0.3
const LINE_HEIGHT = 1.3
const ANISOTROPY = 4
const DEFAULT_WEIGHT = 500
const PLATE_OPACITY = 0.92
const labelCache = new Map<string, { texture: CanvasTexture; aspect: number }>()

/** White text rendered to a canvas once; tint it with the material colour so it follows the theme. */
export function labelTexture(text: string, weight = DEFAULT_WEIGHT, mono = true) {
  const key = `${weight}|${mono}|${text}`
  const hit = labelCache.get(key)
  if (hit) return hit
  const family = mono ? '"Geist Mono", ui-monospace, monospace' : 'Geist, system-ui, sans-serif'
  const font = `${weight} ${LABEL_FONT_PX}px ${family}`
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.font = font
  const measured = ctx ? ctx.measureText(text).width : text.length * LABEL_FONT_PX
  canvas.width = Math.ceil(measured + LABEL_FONT_PX * LABEL_PAD * DOUBLE)
  canvas.height = Math.ceil(LABEL_FONT_PX * LINE_HEIGHT)
  if (ctx) {
    ctx.font = font
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, LABEL_FONT_PX * LABEL_PAD, canvas.height * HALF)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = ANISOTROPY
  const entry = { texture, aspect: canvas.width / canvas.height }
  labelCache.set(key, entry)
  return entry
}

// Canvases only draw with a web font once it has loaded, and fonts no longer hold up the first paint, so a label made
// early would keep the fallback face. When fonts finish loading, drop every cached texture and let labels redraw.
let fontsVersion = 0
const fontListeners = new Set<() => void>()
document.fonts?.addEventListener('loadingdone', () => {
  labelCache.forEach((entry) => entry.texture.dispose())
  labelCache.clear()
  fontsVersion += 1
  fontListeners.forEach((notify) => notify())
})

/** Re-renders the caller when web fonts finish loading, so anything sized from label text measures it again. */
export const useFontsVersion = () =>
  useSyncExternalStore(
    (notify) => {
      fontListeners.add(notify)
      return () => {
        fontListeners.delete(notify)
      }
    },
    () => fontsVersion,
  )

/** The largest text height, up to `height`, at which every one of `texts` fits within `maxWidth`. */
export function fitLabelHeight(texts: string[], maxWidth: number, height: number, weight?: number, mono?: boolean) {
  return texts.reduce((fitted, text) => Math.min(fitted, maxWidth / labelTexture(text, weight, mono).aspect), height)
}

type LabelProps = {
  text: string
  height: number
  /** Shrinks the text (never stretches it) so it is no wider than this. */
  maxWidth?: number
  color: Color
  position?: [number, number, number]
  weight?: number
  mono?: boolean
  /** 'left' anchors the text's left edge at `position`. */
  align?: 'center' | 'left'
  opacity?: number
  /** Sets the text on a solid tag of this colour (outlined in `plateEdge`), so it stays readable over any geometry. */
  plate?: Color
  plateEdge?: Color
}

export function Label({
  text,
  height,
  maxWidth,
  color,
  position = [0, 0, 0],
  weight,
  mono,
  align = 'center',
  opacity = 1,
  plate,
  plateEdge,
}: LabelProps) {
  useFontsVersion()
  const { texture, aspect } = labelTexture(text, weight, mono)
  const fitted = maxWidth ? Math.min(height, maxWidth / aspect) : height
  const width = fitted * aspect
  const x = align === 'left' ? position[0] + width * HALF : position[0]
  return (
    <group position={[x, position[1], position[2]]}>
      {plate ? (
        // The text texture already carries its own padding, so a plate of the same size makes a snug tag.
        <mesh renderOrder={1}>
          <planeGeometry args={[width, fitted]} />
          <meshBasicMaterial color={plate} transparent opacity={opacity * PLATE_OPACITY} depthWrite={false} toneMapped={false} />
          {plateEdge ? <Edges color={plateEdge} /> : null}
        </mesh>
      ) : null}
      <mesh renderOrder={2}>
        <planeGeometry args={[width, fitted]} />
        <meshBasicMaterial map={texture} color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- Pointer interaction under the HTML layer ---------- */

/** Page content that should keep the pointer to itself even when a 3D object sits behind it. */
const PAGE_CONTENT = 'a, button, input, textarea, select, label, summary, p, h1, h2, h3, h4, li, dt, dd, pre, .card, .nav, dialog'

/** True when a pointer event on a 3D object started over empty page space rather than over text or controls. */
export function fromEmptySpace(e: ThreeEvent<PointerEvent | MouseEvent>) {
  const target = e.nativeEvent.target
  return !(target instanceof Element && target.closest(PAGE_CONTENT))
}

/** Shows a pointer (and grows the custom cursor) while a clickable 3D object is under the mouse. */
export function setPointer3D(on: boolean) {
  document.documentElement.classList.toggle('cursor-3d', on)
}

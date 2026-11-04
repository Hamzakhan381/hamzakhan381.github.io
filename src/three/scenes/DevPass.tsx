import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshMatcapMaterial,
  MeshStandardMaterial,
  Path,
  Plane,
  Raycaster,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import config from '../scene.json'
import face from '../passFace.json'
import { faceHeight, loadIdPhoto, paintFace, type Photo } from '../passFaces'
import { fromEmptySpace, useFontsVersion, useHalfWidth, usePalette } from '../kit'
import { about, experience, profile } from '../../content'
import { story } from '../../lib/story'
import { reduceMotion, scrollState } from '../../lib/scroll'
import { getQuality } from '../../lib/quality'
import { useAppLoaded } from '../../lib/intro'
import { DOUBLE, HALF, TAU, clamp, hash } from '../../lib/math'

const P = config.pass
const CARD = P.card
const CLIP = P.clip
const STRAP = P.strap
const [FACE_W, FACE_H] = face.size
const FRONT = 0
const BACK = 1
const XYZ = 3
const RGBA = 4
const GLOW_PX = 128
const ANISOTROPY = 8
const WHITE = '#ffffff'
/** Only a mouse (or trackpad) can grab the pass; touch screens flip it with a tap and keep scrolling as usual. */
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
const tanHalfFov = Math.tan(MathUtils.degToRad(config.camera.fov) * HALF)
/** Half the visible height at the pass's depth. */
const halfHeight = tanHalfFov * (config.camera.z - P.place.z)
const EXPERIENCE = P.faces.indexOf('job')

/* Where things sit inside the card group, whose origin is the point the strap is tied to (top of the ring). */
const BODY_Y = -(CARD.height * HALF + CLIP.strapY)
const PRINT_Z = CARD.depth * HALF + CARD.printLift
const CLIP_Z = CARD.depth * HALF + CLIP.z
const PLATE_Y = CLIP.y - CLIP.strapY
const RING_Y = CLIP.ringY - CLIP.strapY
const JAW_Y = -(face.slot.y / FACE_H) * CARD.height - CLIP.strapY
const JAW_Z = CARD.depth * HALF + CLIP.jawZ

type Spring = { x: number; v: number }

/** Advances a damped spring towards `target` in `steps` small steps of `h` seconds, so it's stable at any frame rate. */
function settle(s: Spring, target: number, period: number, zeta: number, h: number, steps: number): Spring {
  const w = TAU / period
  return Array.from({ length: steps }).reduce<Spring>((cur) => {
    const v = cur.v + (-w * w * (cur.x - target) - DOUBLE * zeta * w * cur.v) * h
    return { x: cur.x + v * h, v }
  }, s)
}

function roundRect<T extends Shape | Path>(p: T, cx: number, cy: number, w: number, h: number, r: number) {
  const x = cx - w * HALF
  const y = cy - h * HALF
  p.moveTo(x + r, y)
  p.lineTo(x + w - r, y)
  p.quadraticCurveTo(x + w, y, x + w, y + r)
  p.lineTo(x + w, y + h - r)
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  p.lineTo(x + r, y + h)
  p.quadraticCurveTo(x, y + h, x, y + h - r)
  p.lineTo(x, y + r)
  p.quadraticCurveTo(x, y, x + r, y)
  return p
}

/** The printed face: a rounded rectangle a hair inside the card, with UVs spanning the whole print. */
function printGeometry() {
  const w = CARD.width - CARD.printInset
  const h = CARD.height - CARD.printInset
  const geometry = new ShapeGeometry(roundRect(new Shape(), 0, 0, w, h, CARD.printRadius), CARD.curveSegments)
  const pos = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  Array.from({ length: pos.count }, (_, i) => i).forEach((i) => uv.setXY(i, pos.getX(i) / w + HALF, pos.getY(i) / h + HALF))
  return geometry
}

/** The metal clip: a rounded plate with a slot the strap's ring runs through. */
function clipGeometry() {
  const [w, h, r] = CLIP.plate
  const [hx, hy, hw, hh, hr] = CLIP.hole
  const plate = roundRect(new Shape(), 0, 0, w, h, r)
  plate.holes.push(roundRect(new Path(), hx, hy, hw, hh, hr))
  const geometry = new ExtrudeGeometry(plate, {
    depth: CLIP.depth,
    bevelEnabled: true,
    bevelThickness: CLIP.bevel,
    bevelSize: CLIP.bevel,
    bevelSegments: CLIP.bevelSegments,
    curveSegments: CLIP.curveSegments,
  })
  geometry.center()
  return geometry
}

/** A flat ribbon of `segments` quads whose vertices are rewritten every frame; colour alpha fades it under the menu. */
function strapGeometry() {
  const rows = STRAP.segments + 1
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(rows * DOUBLE * XYZ), XYZ))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(rows * DOUBLE * XYZ), XYZ))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(rows * DOUBLE * DOUBLE), DOUBLE))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(rows * DOUBLE * RGBA).fill(1), RGBA))
  geometry.setIndex(
    Array.from({ length: STRAP.segments }, (_, i) => {
      const a = i * DOUBLE
      return [a, a + 1, a + DOUBLE, a + 1, a + DOUBLE + 1, a + DOUBLE]
    }).flat(),
  )
  return geometry
}

/**
 * The lanyard print: name and role repeated along a night-blue band with accent edges. The canvas is a whole number
 * of repeats wide, so it tiles seamlessly; `aspect` keeps the lettering in proportion along the strap.
 */
function strapTexture() {
  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d')
  const text = `${profile.shortName}${STRAP.separator}${about.story.pass.role}${STRAP.separator}`.toUpperCase()
  const font = `600 ${STRAP.font}px "Geist Mono", ui-monospace, monospace`
  if (g) g.font = font
  const repeat = Math.ceil(g ? g.measureText(text).width : STRAP.height)
  canvas.width = repeat * STRAP.copies
  canvas.height = STRAP.height
  if (g) {
    g.fillStyle = STRAP.color
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.fillStyle = STRAP.edge
    g.fillRect(0, STRAP.edgeInset, canvas.width, STRAP.edgeWidth)
    g.fillRect(0, canvas.height - STRAP.edgeInset - STRAP.edgeWidth, canvas.width, STRAP.edgeWidth)
    g.font = font
    g.fillStyle = config.palette.accent
    g.textBaseline = 'middle'
    Array.from({ length: STRAP.copies }, (_, i) => i).forEach((i) => g.fillText(text, i * repeat, canvas.height * HALF))
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.anisotropy = ANISOTROPY
  return { texture, aspect: canvas.width / STRAP.copies / canvas.height }
}

/** A lit metal ball (bright highlight up and to the left, falling off to a dark rim), for the clip's matcap. */
function matcapTexture() {
  const M = P.metal.matcap
  const canvas = document.createElement('canvas')
  canvas.width = M.px
  canvas.height = M.px
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = M.px * HALF
    const [hx, hy] = M.highlight
    const gradient = ctx.createRadialGradient(M.px * hx, M.px * hy, 0, c, c, c)
    M.stopAt.forEach((at, i) => gradient.addColorStop(at, M.stopColor[i]))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, M.px, M.px)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = GLOW_PX
  canvas.height = GLOW_PX
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = GLOW_PX * HALF
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GLOW_PX, GLOW_PX)
  }
  return new CanvasTexture(canvas)
}

function starGeometry() {
  const S = P.stars
  const [sx, sy, sz] = S.spread
  const geometry = new BufferGeometry()
  const points = Array.from({ length: S.count }, (_, i) => [hash(i, 0) * sx, hash(i, 1) * sy, S.z + hash(i, DOUBLE) * sz]).flat()
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(points), XYZ))
  return geometry
}

const IDLE_TIMEOUT_MS = 600
/** Painting ahead can wait much longer for a quiet moment: it only has to be done before the next chapter. */
const PREPAINT_TIMEOUT_MS = 2500
const hasIdle = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
/** Runs `fn` when the browser is idle (or after `timeout` ms at the latest, or soon where idle callbacks don't exist). */
const idle = (fn: () => void, timeout = IDLE_TIMEOUT_MS) => (hasIdle ? window.requestIdleCallback(fn, { timeout }) : window.setTimeout(fn, timeout))
const cancelIdle = (handle: number) => (hasIdle ? window.cancelIdleCallback(handle) : window.clearTimeout(handle))

/** The faces in reading order, so the pass can paint the next one on its hidden side before it's needed. */
const SEQUENCE = ['id', ...experience.map((_, i) => `job-${i}`), 'edu', 'stack', 'principles', 'now', 'id']
const OUTRO = P.faces.length - 1
/** The face you'll most likely reach next: the following one in reading order (at the very end, the one before). */
const upcoming = (shown: string, chapter: number) => {
  if (chapter === OUTRO) return SEQUENCE[SEQUENCE.length - DOUBLE]
  const at = SEQUENCE.indexOf(shown)
  return at >= 0 ? SEQUENCE[at + 1] : undefined
}

/** Toggles the "grab" cursor (and, while dragging, "grabbing") on the page. */
const setGrab = (name: 'cursor-grab' | 'is-grabbing', on: boolean) => document.documentElement.classList.toggle(name, on)

/**
 * About: Hamza's dev pass, hanging on a lanyard beside the story. It drops in on load and swings like a real badge:
 * scrolling leans it back, a drag swings it (and a fling lets it swing back), a click flips it over. Each chapter
 * flips it to a new face, always painting the side that's turned away, so the swap is never seen: the ID with his
 * photo, then an access pass per job as you read through them, a student ID and the stack, his principles, what he's
 * doing now, and the ID again to close. Reads `story` (written by the About page's chapter triggers).
 */
export function DevPass() {
  // Settled once per visit: a texture keeps the size it was first uploaded at, and rebuilding the pass because the
  // tier dropped mid-visit would spend the very frames the drop is meant to save.
  const [tier] = useState<'high' | 'medium'>(() => (getQuality() === 'high' ? 'high' : 'medium'))
  const palette = usePalette()
  const fonts = useFontsVersion()
  // The drop-in waits for the boot intro to lift, so it plays where you can see it.
  const loaded = useAppLoaded()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const height = useThree((s) => s.size.height)
  const narrow = useThree((s) => s.size.width <= P.mobile.narrowWidth || s.size.width / s.size.height < config.narrowAspect)
  const half = useHalfWidth(P.place.z)

  const rig = useRef<Group>(null)
  const card = useRef<Group>(null)
  const strap = useRef<Mesh>(null)
  const halo = useRef<Mesh>(null)
  const [photo, setPhoto] = useState<Photo>(null)
  const [ready, setReady] = useState(false)
  const photoRef = useRef<Photo>(null)
  const sim = useRef({
    roll: { x: 0, v: 0 },
    pitch: { x: 0, v: 0 },
    flip: { x: 0, v: 0 },
    drop: { x: reduceMotion ? 0 : P.drop.from, v: 0 },
    yawTarget: 0,
    hover: 0,
    age: 0,
  })
  const pose = useRef({ ...P.poses[0] })
  /** What each printed side currently shows ('' for nothing yet), and the face the pass is turning to. */
  const painted = useRef(['id', ''])
  const shown = useRef('id')
  /** The pending idle callback that paints the next face onto the hidden side (0 when none). */
  const prepaint = useRef(0)
  const chapterFace = useRef('id')
  const flipped = useRef(false)
  const lastJob = useRef(0)
  const hovered = useRef(false)
  const drag = useRef({ active: false, x: 0, y: 0, t: 0, moved: 0 })

  // Two printed sides, each a canvas the faces are painted into, at the tier's texture size.
  const faceWidth = P.texture[tier]
  const sides = useMemo(
    () =>
      [FRONT, BACK].map(() => {
        const canvas = document.createElement('canvas')
        canvas.width = faceWidth
        canvas.height = faceHeight(faceWidth)
        const texture = new CanvasTexture(canvas)
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = ANISOTROPY
        return { canvas, texture }
      }),
    [faceWidth],
  )

  // The clip's shine comes from a tiny painted matcap (a lit metal ball) rather than a reflection map: building one
  // meant an extra render pass and shader compiles the moment the page opened, which froze integrated graphics.
  const shine = useMemo(matcapTexture, [])

  // Redrawn when web fonts arrive, so the lanyard is printed in the site's mono face.
  const strapPrint = useMemo(() => strapTexture(), [fonts])
  const strapMap = strapPrint.texture
  const geometries = useMemo(() => {
    const [jw, jh, jd, jr] = CLIP.jaw
    const [rr, rt, rs, rt2] = CLIP.ring
    return {
      body: new RoundedBoxGeometry(CARD.width, CARD.height, CARD.depth, CARD.segments, CARD.radius),
      print: printGeometry(),
      clip: clipGeometry(),
      jaw: new RoundedBoxGeometry(jw, jh, jd, CLIP.jawSegments, jr),
      ring: new TorusGeometry(rr, rt, rs, rt2),
      strap: strapGeometry(),
      stars: starGeometry(),
    }
  }, [])
  const materials = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: P.body.color, roughness: P.body.roughness }),
      // Lit like ink on a card, with a faint glow of its own so it reads at any angle: not a lit screen, so the
      // photo keeps its true tones instead of washing out to white.
      prints: sides.map(
        ({ texture }) =>
          new MeshStandardMaterial({
            map: texture,
            emissiveMap: texture,
            emissive: WHITE,
            emissiveIntensity: P.print.emissive,
            roughness: P.print.roughness,
          }),
      ),
      metal: new MeshMatcapMaterial({ matcap: shine, color: P.metal.color }),
      strap: new MeshStandardMaterial({
        map: strapMap,
        emissiveMap: strapMap,
        emissive: WHITE,
        emissiveIntensity: STRAP.emissive,
        roughness: STRAP.roughness,
        vertexColors: true,
        transparent: true,
        side: DoubleSide,
      }),
    }),
    [sides, strapMap, shine],
  )
  const glow = useMemo(glowTexture, [])

  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose())
      glow.dispose()
      shine.dispose()
    },
    [geometries, glow, shine],
  )
  useEffect(() => () => strapMap.dispose(), [strapMap])
  useEffect(
    () => () =>
      sides.forEach(({ texture }) => {
        texture.dispose()
      }),
    [sides],
  )
  useEffect(
    () => () => {
      materials.body.dispose()
      materials.metal.dispose()
      materials.strap.dispose()
      materials.prints.forEach((material) => material.dispose())
    },
    [materials],
  )

  /** Idle callbacks still waiting to upload a freshly painted side. */
  const uploads = useRef<number[]>([])
  useEffect(
    () => () => {
      uploads.current.forEach(cancelIdle)
    },
    [],
  )

  /**
   * Paints face `key` onto printed side `side` (0 front, 1 back). The upload follows in its own idle moment, so the
   * painting and the upload never land in the same task (if the side is needed sooner, the next frame uploads it).
   */
  const paint = (side: number, key: string) => {
    const target = sides[side]
    paintFace(target.canvas, key, photoRef.current)
    target.texture.needsUpdate = true
    painted.current[side] = key
    uploads.current = [...uploads.current, idle(() => gl.initTexture(target.texture))]
  }

  // The photo is cut out once, at the size it's printed at, in an idle moment after the page has opened.
  useEffect(() => {
    let live = true
    const load = async () => {
      const cut = await loadIdPhoto(profile.photo.large, Math.round((face.photo.w / FACE_W) * faceWidth))
      if (live) setPhoto(cut)
    }
    const start = idle(() => void load())
    return () => {
      live = false
      cancelIdle(start)
    }
  }, [faceWidth])

  // Paint the side facing you once the photo is in (and again when web fonts arrive); the hidden side, if it has a
  // face yet, follows in the next idle moment, so no single frame does both.
  useEffect(() => {
    if (!photo) return undefined
    photoRef.current = photo
    const front = Math.cos(sim.current.flip.x) > 0 ? FRONT : BACK
    const other = front === FRONT ? BACK : FRONT
    paint(front, painted.current[front])
    setReady(true)
    const key = painted.current[other]
    const later = key ? idle(() => paint(other, key)) : 0
    return () => {
      if (later) cancelIdle(later)
    }
    // `paint` only reads refs and the memoised canvases, which are the dependencies here.
  }, [photo, sides, fonts])
  useEffect(
    () => () => {
      if (prepaint.current) cancelIdle(prepaint.current)
    },
    [],
  )

  /** Turns the pass to show `key`: paints it on the side facing away, then flips that side round. */
  const turnTo = (key: string) => {
    const s = sim.current
    const frontShowing = Math.cos(s.flip.x) > 0
    shown.current = key
    if (reduceMotion) {
      paint(frontShowing ? FRONT : BACK, key)
      return
    }
    const away = frontShowing ? BACK : FRONT
    if (painted.current[away] !== key) paint(away, key)
    const facing = away === FRONT ? 0 : Math.PI
    s.yawTarget = facing + TAU * Math.ceil((s.flip.x - facing) / TAU)
    // A flip twists the lanyard and sets it swinging; on phones the lanyard is long, so it gets a gentler push.
    s.roll = { x: s.roll.x, v: s.roll.v + P.swing.flipKick * (narrow ? P.mobile.kick : 1) }
  }

  // Dragging: the pass swings towards the pointer while held; a press that barely moves is a click, which flips it.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (d.active) d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y))
    }
    const up = () => {
      const d = drag.current
      if (!d.active) return
      d.active = false
      setGrab('is-grabbing', false)
      if (d.moved < P.drag.clickPx && performance.now() - d.t < P.drag.clickMs) flipped.current = !flipped.current
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setGrab('is-grabbing', false)
      setGrab('cursor-grab', false)
    }
  }, [])

  const raycaster = useMemo(() => new Raycaster(), [])
  const plane = useMemo(() => new Plane(new Vector3(0, 0, 1), -P.place.z), [])
  const ndc = useMemo(() => new Vector2(), [])
  const hit = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  const mid = useMemo(() => new Vector3(), [])
  const tie = useMemo(() => new Vector3(), [])
  const strapBottom = useMemo(() => new Vector3(), [])
  const strapTop = useMemo(() => new Vector3(), [])

  /** The face each chapter kind shows; the rest show the face named after them. */
  const pick = useMemo<Record<string, () => string>>(
    () => ({
      job: () => `job-${lastJob.current}`,
      skills: () => (story.local < P.skillsSplit ? 'edu' : 'stack'),
    }),
    [],
  )

  /** The swing angle that puts the pass under the pointer, as seen from the pivot. */
  const dragAngle = (pivotX: number, pivotY: number) => {
    ndc.set(scrollState.pointerX, scrollState.pointerY)
    raycaster.setFromCamera(ndc, camera)
    if (!raycaster.ray.intersectPlane(plane, hit)) return sim.current.roll.x
    return clamp(Math.atan2(hit.x - pivotX, pivotY - hit.y), -P.drag.maxRoll, P.drag.maxRoll)
  }

  /** Lays the strap from the clip's ring up to the pivot above the page, bending a little as it swings. */
  const layStrap = (mesh: Mesh, bottom: Vector3, top: Vector3, twist: number, width: number) => {
    const geometry = mesh.geometry
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const s = sim.current
    mid.copy(bottom).add(top).multiplyScalar(HALF)
    const midX = mid.x - s.roll.v * STRAP.bend
    const midZ = mid.z + s.pitch.v * STRAP.bend
    const midY = mid.y
    const rows = STRAP.segments + 1
    const toWorld = rig.current?.matrixWorld
    const aspect = strapPrint.aspect
    const [fadeFrom, fadeTo] = STRAP.fadePx
    const along = { x: 0, y: 0, z: 0, travelled: 0 }
    Array.from({ length: rows }, (_, i) => i).forEach((i) => {
      const t = i / STRAP.segments
      const a = (1 - t) * (1 - t)
      const b = DOUBLE * (1 - t) * t
      const c = t * t
      const px = a * bottom.x + b * midX + c * top.x
      const py = a * bottom.y + b * midY + c * top.y
      const pz = a * bottom.z + b * midZ + c * top.z
      // Tangent of the curve, then the strap's width direction: across the view, turned by the twist.
      const tx = DOUBLE * (1 - t) * (midX - bottom.x) + DOUBLE * t * (top.x - midX)
      const ty = DOUBLE * (1 - t) * (midY - bottom.y) + DOUBLE * t * (top.y - midY)
      const tz = DOUBLE * (1 - t) * (midZ - bottom.z) + DOUBLE * t * (top.z - midZ)
      const tl = Math.hypot(tx, ty, tz) || 1
      const sideX = ty / tl
      const sideY = -tx / tl
      const sideL = Math.hypot(sideX, sideY) || 1
      const turn = twist * (1 - t)
      const cos = Math.cos(turn)
      const sin = Math.sin(turn)
      // Rotate the side vector u = (ux, uy, 0) about the tangent: u cos + (T × u) sin, as u ⟂ T.
      const ux = sideX / sideL
      const uy = sideY / sideL
      const cx = -(tz / tl) * uy
      const cy = (tz / tl) * ux
      const cz = (tx / tl) * uy - (ty / tl) * ux
      const wx = (ux * cos + cx * sin) * width * HALF
      const wy = (uy * cos + cy * sin) * width * HALF
      const wz = cz * sin * width * HALF
      positions.setXYZ(i * DOUBLE, px + wx, py + wy, pz + wz)
      positions.setXYZ(i * DOUBLE + 1, px - wx, py - wy, pz - wz)
      normals.setXYZ(i * DOUBLE, cx * cos - ux * sin, cy * cos - uy * sin, cz * cos)
      normals.setXYZ(i * DOUBLE + 1, cx * cos - ux * sin, cy * cos - uy * sin, cz * cos)
      along.travelled += i ? Math.hypot(px - along.x, py - along.y, pz - along.z) : 0
      along.x = px
      along.y = py
      along.z = pz
      const u = along.travelled / (width * aspect)
      uvs.setXY(i * DOUBLE, u, 1)
      uvs.setXY(i * DOUBLE + 1, u, 0)
      // Fade out just under the menu bar, so the strap seems to run on up behind it.
      const projected = tie.set(px, py, pz)
      if (toWorld) projected.applyMatrix4(toWorld)
      projected.project(camera)
      const screenY = (1 - projected.y) * HALF * height
      const alpha = MathUtils.smoothstep(screenY, fadeFrom, fadeTo)
      colors.setW(i * DOUBLE, alpha)
      colors.setW(i * DOUBLE + 1, alpha)
    })
    positions.needsUpdate = true
    normals.needsUpdate = true
    uvs.needsUpdate = true
    colors.needsUpdate = true
  }

  useFrame((_, rawDelta) => {
    const r = rig.current
    const c = card.current
    const m = strap.current
    const glowMesh = halo.current
    if (!r || !c || !m || !glowMesh) return
    r.visible = ready
    if (!ready) return
    const dt = Math.min(rawDelta, P.maxDelta)
    const s = sim.current
    if (loaded) s.age += dt

    // Which face this moment of the story wants: the ID, the job being read, the student ID then the stack, …
    const ch = clamp(story.chapter, 0, P.faces.length - 1)
    if (ch === EXPERIENCE && scrollState.focus >= 0) lastJob.current = scrollState.focus
    const kind = P.faces[ch]
    const wanted = pick[kind]?.() ?? kind
    if (wanted !== chapterFace.current) {
      chapterFace.current = wanted
      flipped.current = false
    }
    const alternate = wanted === 'id' ? 'back' : 'id'
    const want = flipped.current ? alternate : wanted
    if (want !== shown.current) turnTo(want)

    // Where it hangs: right of the text on wide screens, in the space above each heading on phones.
    const target = P.poses[ch] ?? P.poses[0]
    const p = pose.current
    p.yaw = MathUtils.damp(p.yaw, target.yaw, P.poseDamping, dt)
    p.x = MathUtils.damp(p.x, target.x, P.poseDamping, dt)
    p.y = MathUtils.damp(p.y, target.y, P.poseDamping, dt)
    p.scale = MathUtils.damp(p.scale, target.scale, P.poseDamping, dt)
    const scale = narrow ? P.mobile.scale : p.scale
    const anchor = story.top + (ch ? P.mobile.chapterAnchor : P.mobile.heroAnchor)
    const cx = narrow ? P.mobile.x : half * P.place.x + p.x
    const cy = narrow ? (HALF - anchor) * DOUBLE * halfHeight : P.place.y + p.y
    const tieY = cy + (CARD.height * HALF + CLIP.strapY) * scale
    // On phones the pass scrolls away with its chapter, so the pivot rises with it rather than letting it go slack.
    const pivotY = Math.max(halfHeight + P.pivotAbove, tieY + P.minLength)
    const length = pivotY - tieY

    // Swing: scrolling leans it back (and it swings through when you stop), a drag pulls it, a flip kicks it.
    const steps = Math.max(1, Math.ceil(dt / P.maxStep))
    const h = dt / steps
    const S = P.swing
    const dragging = drag.current.active
    const lean = reduceMotion ? 0 : clamp(scrollState.velocity * S.scroll, -S.maxPitch, S.maxPitch)
    const rollTarget = dragging ? dragAngle(cx, pivotY) : 0
    s.roll = settle(s.roll, rollTarget, dragging ? P.drag.period : S.period, dragging ? P.drag.damping : S.damping, h, steps)
    s.pitch = settle(s.pitch, lean, S.pitchPeriod, S.damping, h, steps)
    s.flip = settle(s.flip, s.yawTarget, P.yaw.period, P.yaw.damping, h, steps)
    // The lanyard is let out on load (the drop-in), reeled up out of the way while the principles rail slides across
    // on wide screens, and let out again after it, bouncing back into place.
    const R = P.rail
    const reeled = !narrow && ch === R.chapter ? MathUtils.smoothstep(story.local, R.from, R.to) * R.lift : 0
    if (s.age > P.drop.delay) s.drop = settle(s.drop, reduceMotion ? 0 : reeled, P.drop.period, P.drop.damping, h, steps)
    s.hover = MathUtils.damp(s.hover, hovered.current || dragging ? 1 : 0, P.hover.damping, dt)

    // Once a flip has settled and the page is at rest, paint the face you'll most likely reach next onto the hidden
    // side in an idle moment, so the next flip only has to turn (and the painting never lands mid-scroll).
    const settled = Math.abs(s.flip.x - s.yawTarget) < P.yaw.settled && Math.abs(s.flip.v) < P.yaw.settled
    const calm = Math.abs(scrollState.velocity) < P.prepaintCalm
    const next = upcoming(shown.current, ch)
    const hidden = Math.cos(s.flip.x) > 0 ? BACK : FRONT
    if (settled && calm && !prepaint.current && !reduceMotion && next && painted.current[hidden] !== next) {
      prepaint.current = idle(() => {
        prepaint.current = 0
        if ((Math.cos(sim.current.flip.x) > 0 ? BACK : FRONT) === hidden) paint(hidden, next)
      }, PREPAINT_TIMEOUT_MS)
    }

    // Hang the card along the swing from the pivot; its own yaw is the chapter's pose, a slow turn as you read
    // through the chapter, and the flips.
    const roll = s.roll.x
    const pitch = s.pitch.x
    dir.set(Math.sin(roll) * Math.cos(pitch), -Math.cos(roll) * Math.cos(pitch), -Math.sin(pitch))
    const sweep = reduceMotion ? 0 : (story.local - HALF) * P.sweep
    c.position.set(cx, pivotY, P.place.z).addScaledVector(dir, length - s.drop.x)
    c.position.z += s.hover * P.hover.lift
    c.rotation.set(pitch, p.yaw + sweep + s.flip.x, roll, 'ZXY')
    c.scale.setScalar(scale * (1 + s.hover * P.hover.grow))
    c.updateMatrix()
    glowMesh.position.set(cx, cy + P.halo.y * scale, P.halo.z)
    glowMesh.scale.setScalar(scale)

    strapBottom.set(0, 0, CLIP_Z).applyMatrix4(c.matrix)
    strapTop.set(cx, pivotY, P.place.z)
    layStrap(m, strapBottom, strapTop, (p.yaw + sweep) * STRAP.twist, STRAP.width * scale)
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!fromEmptySpace(e)) return
    e.stopPropagation()
    if (!canHover) return
    drag.current = { active: true, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, t: performance.now(), moved: 0 }
    setGrab('is-grabbing', true)
  }
  // Touch screens have no drag (that would fight the page scroll); a tap flips the pass instead.
  const onTap = (e: ThreeEvent<MouseEvent>) => {
    if (canHover || !fromEmptySpace(e)) return
    e.stopPropagation()
    flipped.current = !flipped.current
  }
  const onOver = () => {
    if (!canHover) return
    hovered.current = true
    setGrab('cursor-grab', true)
  }
  const onOut = () => {
    hovered.current = false
    setGrab('cursor-grab', false)
  }

  return (
    <>
      <points geometry={geometries.stars}>
        <pointsMaterial size={P.stars.size} map={glow} color={palette.line} transparent opacity={P.stars.opacity} depthWrite={false} sizeAttenuation />
      </points>
      <mesh position={[0, 0, P.nebula.z]}>
        <planeGeometry args={[P.nebula.size[0], P.nebula.size[1]]} />
        <meshBasicMaterial map={glow} color={palette.accent} transparent opacity={P.nebula.opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[P.nebula.second[0] * P.nebula.size[0], P.nebula.second[1] * P.nebula.size[1], P.nebula.z]}>
        <planeGeometry args={[P.nebula.size[0], P.nebula.size[1]]} />
        <meshBasicMaterial map={glow} color={P.nebula.secondColor} transparent opacity={P.nebula.secondOpacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <planeGeometry args={[P.halo.size, P.halo.size]} />
        <meshBasicMaterial map={glow} color={palette.accent} transparent opacity={P.halo.opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={rig} visible={false}>
        <mesh ref={strap} geometry={geometries.strap} material={materials.strap} frustumCulled={false} />
        <group ref={card} matrixAutoUpdate={false}>
          <mesh geometry={geometries.body} material={materials.body} position={[0, BODY_Y, 0]} />
          <mesh geometry={geometries.print} material={materials.prints[FRONT]} position={[0, BODY_Y, PRINT_Z]} />
          <mesh geometry={geometries.print} material={materials.prints[BACK]} position={[0, BODY_Y, -PRINT_Z]} rotation={[0, Math.PI, 0]} />
          <mesh geometry={geometries.clip} material={materials.metal} position={[0, PLATE_Y, CLIP_Z]} />
          <mesh geometry={geometries.jaw} material={materials.metal} position={[0, JAW_Y, JAW_Z]} />
          <mesh geometry={geometries.ring} material={materials.metal} position={[0, RING_Y, CLIP_Z]} />
          {/* An invisible sheet over the card that catches hover, drag and taps from either side. */}
          <mesh position={[0, BODY_Y, 0]} onPointerDown={onDown} onClick={onTap} onPointerOver={onOver} onPointerOut={onOut}>
            <planeGeometry args={[CARD.width, CARD.height]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} side={DoubleSide} />
          </mesh>
        </group>
      </group>
    </>
  )
}

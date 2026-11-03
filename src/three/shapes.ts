import config from './scene.json'
import { DOUBLE, HALF, TAU } from '../lib/math'

export type ShapeName = keyof typeof config.shapes
type Point = [number, number, number]

const XYZ = 3
const CUBE_FACES = 6
const GOLDEN_ANGLE = 2.399963229728653
const ALPHA_CHANNEL = 3
const RGBA = 4
const ALPHA_THRESHOLD = 128
const S = config.shapes

const rand = (scale = 1) => (Math.random() - HALF) * scale
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

function fibonacciPoint(i: number, total: number, radius: number): Point {
  const y = 1 - (i / Math.max(total - 1, 1)) * DOUBLE
  const ring = Math.sqrt(1 - y * y)
  const theta = GOLDEN_ANGLE * i
  return [Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius]
}

/** Sphere with a tilted particle ring, like a small planet. */
function planet(count: number): Point[] {
  const ringCount = Math.floor(count * S.planet.ringShare)
  const sphereCount = count - ringCount
  const sphere = Array.from({ length: sphereCount }, (_, i) =>
    fibonacciPoint(i, sphereCount, S.planet.radius + rand(S.planet.shell)),
  )
  const ring = Array.from({ length: ringCount }, (): Point => {
    const angle = Math.random() * TAU
    const r = S.planet.ringInner + Math.sqrt(Math.random()) * (S.planet.ringOuter - S.planet.ringInner)
    return [Math.cos(angle) * r, rand(S.planet.ringThickness), Math.sin(angle) * r]
  })
  return [...sphere, ...ring]
}

/** Two twisting strands joined by rungs, like DNA. */
function helix(count: number): Point[] {
  const { height, radius, turns, rungs, rungShare, jitter } = S.helix
  const strandPoint = (t: number, strand: number): Point => {
    const angle = t * turns * TAU + strand * Math.PI
    return [Math.cos(angle) * radius, (t - HALF) * height, Math.sin(angle) * radius]
  }
  return Array.from({ length: count }, (): Point => {
    if (Math.random() < rungShare) {
      const t = (Math.floor(Math.random() * rungs) + HALF) / rungs
      const a = strandPoint(t, 0)
      const b = strandPoint(t, 1)
      const u = Math.random()
      return a.map((v, axis) => v + (b[axis] - v) * u + rand(jitter)) as Point
    }
    const p = strandPoint(Math.random(), Math.random() < HALF ? 0 : 1)
    return p.map((v) => v + rand(jitter * DOUBLE)) as Point
  })
}

/** Surface points of a grid of separated cubes: building blocks. */
function cubes(count: number): Point[] {
  const { grid, size, spacing } = S.cubes
  const offset = (grid - 1) * HALF
  const cells = Array.from({ length: grid ** XYZ }, (_, i): Point => [
    (i % grid) - offset,
    (Math.floor(i / grid) % grid) - offset,
    Math.floor(i / (grid * grid)) - offset,
  ])
  return Array.from({ length: count }, (): Point => {
    const cell = pick(cells)
    const face = Math.floor(Math.random() * CUBE_FACES)
    const axis = face % XYZ
    const sign = face < XYZ ? -1 : 1
    const local: Point = [rand(size), rand(size), rand(size)]
    local[axis] = sign * size * HALF
    return [cell[0] * spacing + local[0], cell[1] * spacing + local[1], cell[2] * spacing + local[2]]
  })
}

/** Spiral galaxy disk with a dense core. */
function galaxy(count: number): Point[] {
  const { arms, radius, twist, spread, thickness, coreShare, coreRadius } = S.galaxy
  return Array.from({ length: count }, (): Point => {
    if (Math.random() < coreShare) {
      const [x, y, z] = fibonacciPoint(Math.floor(Math.random() * count), count, coreRadius * Math.random())
      return [x, y * HALF, z]
    }
    const r = Math.pow(Math.random(), HALF + HALF * HALF) * radius
    const arm = (Math.floor(Math.random() * arms) / arms) * TAU
    const angle = arm + (r / radius) * twist * Math.PI + rand(spread * (1 - r / radius + HALF))
    return [Math.cos(angle) * r, rand(thickness * (1 - r / radius)), Math.sin(angle) * r]
  })
}

/** A fanned stack of paper sheets covered in lines of "text". */
function document3d(count: number): Point[] {
  const { sheets, width, height, gap, lineGap, margin, outlineShare, headerShare, drift } = S.document
  const lines = Math.floor((height - margin * DOUBLE) / lineGap)
  return Array.from({ length: count }, (): Point => {
    const sheet = Math.floor(Math.random() * sheets)
    const z = (sheet - (sheets - 1) * HALF) * gap
    const shift = (sheet - (sheets - 1) * HALF) * drift
    const roll = Math.random()
    const point: [number, number] = (() => {
      if (roll < outlineShare) {
        const edge = Math.random() * (width + height) * DOUBLE
        if (edge < width) return [edge - width * HALF, height * HALF]
        if (edge < width * DOUBLE) return [edge - width * (DOUBLE - HALF), -height * HALF]
        const side = edge - width * DOUBLE
        return side < height ? [-width * HALF, side - height * HALF] : [width * HALF, side - height * (DOUBLE - HALF)]
      }
      if (roll < outlineShare + headerShare) {
        return [-width * HALF + margin + Math.random() * width * HALF, height * HALF - margin - Math.random() * lineGap * DOUBLE]
      }
      const line = DOUBLE + Math.floor(Math.random() * (lines - DOUBLE))
      const lineLength = (width - margin * DOUBLE) * (HALF + HALF * Math.abs(Math.sin(line * GOLDEN_ANGLE)))
      return [-width * HALF + margin + Math.random() * lineLength, height * HALF - margin - line * lineGap]
    })()
    return [point[0] + shift, point[1] + shift * HALF, z]
  })
}

/** Particles sampled from the filled pixels of a word drawn on a 2D canvas. */
function word(count: number): Point[] {
  const { label, width, depth, canvasWidth, canvasHeight, fontSize, step } = S.hello
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return scatter(count)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${fontSize}px Geist, system-ui, sans-serif`
  ctx.fillText(label, canvasWidth * HALF, canvasHeight * HALF)
  const { data } = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  const columns = Math.floor(canvasWidth / step)
  const filled = Array.from({ length: columns * Math.floor(canvasHeight / step) }, (_, i) => [
    (i % columns) * step,
    Math.floor(i / columns) * step,
  ]).filter(([x, y]) => data[(y * canvasWidth + x) * RGBA + ALPHA_CHANNEL] > ALPHA_THRESHOLD)
  if (!filled.length) return scatter(count)
  const scale = width / canvasWidth
  return Array.from({ length: count }, (): Point => {
    const [x, y] = pick(filled)
    return [(x - canvasWidth * HALF + rand(step)) * scale, (canvasHeight * HALF - y + rand(step)) * scale, rand(depth)]
  })
}

function scatter(count: number): Point[] {
  return Array.from({ length: count }, () => fibonacciPoint(Math.floor(Math.random() * count), count, S.scatter.radius * Math.cbrt(Math.random())))
}

const generators: Record<ShapeName, (count: number) => Point[]> = {
  planet,
  helix,
  cubes,
  galaxy,
  document: document3d,
  hello: word,
  scatter,
}

const cache = new Map<string, Float32Array>()

export function getShape(name: ShapeName, count: number): Float32Array {
  const key = `${name}:${count}`
  const hit = cache.get(key)
  if (hit) return hit
  const points = generators[name](count).sort(() => Math.random() - HALF)
  const array = Float32Array.from(points.flat())
  cache.set(key, array)
  return array
}

export const POINT_STRIDE = XYZ

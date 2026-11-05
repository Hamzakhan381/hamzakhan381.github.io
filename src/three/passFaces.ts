import face from './passFace.json'
import config from './scene.json'
import { about, education, experience, home, profile, skills } from '../content'
import { branchSlug, fakeHash } from '../lib/commit'
import { DOUBLE, HALF, TAU, hash } from '../lib/math'

/**
 * The faces of the About page's dev pass, drawn into a canvas: the ID side with Hamza's photo, an access pass for
 * each job, a student ID, the stack, the principles, what he's doing now, and the back of the ID. Layout lives in
 * passFace.json on a 1100 × 1560 card and is scaled to whatever size the texture is.
 */

const F = face
const C = F.colors
const PH = config.pass.photo
const T = about.story.pass
const [FACE_W, FACE_H] = F.size
const RGBA = 4
const ALPHA = 3
const BLUE = 2
const BYTE = 255
const HEX = 16
const HEX_PAIR = 2
const HEX_R = 1
const HEX_G = 3
const HEX_B = 5
const HEAVY = 800
const BOLD = 700
const SEMI = 600
const MEDIUM = 500
const PAD_DIGITS = 2
const BARCODE_CHANNEL = 7
const GAP_CHANNEL = 8
const ELLIPSIS = '…'
const DISPLAY = 'Geist, ui-sans-serif, system-ui, sans-serif'
const MONO = '"Geist Mono", ui-monospace, monospace'

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + HEX_PAIR), HEX)
const accent = config.palette.accent
const ACCENT_RGB = [HEX_R, HEX_G, HEX_B].map((at) => channel(accent, at)).join(',')
/** The site accent at `alpha`, for gradients and strokes. */
const accentAlpha = (alpha: number) => `rgba(${ACCENT_RGB},${alpha})`
const INK_RGB = [HEX_R, HEX_G, HEX_B].map((at) => channel(C.ink, at)).join(',')
/** The card's ink colour at `alpha`, for fine print. */
const inkAlpha = (alpha: number) => `rgba(${INK_RGB},${alpha})`
/** Grows each QR module a hair so neighbours meet without hairline seams. */
const FILL_OVERLAP = 0.5
/** A stable random number in [0, 1) for `i` on stream `stream`. */
const random01 = (i: number, stream: number) => (hash(i, stream) + 1) * HALF
const pad2 = (n: number) => String(n).padStart(PAD_DIGITS, '0')
const seedOf = (text: string) => Array.from(text).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
const year = new Date().getFullYear()
const available = profile.availability.open

export type Photo = HTMLCanvasElement | null

/* ---------- The ID photo ---------- */

/** How much a pixel looks like the bright, grey wall behind him: 0 for him, 1 for wall, soft in between. */
function wallness(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const saturation = max ? (max - Math.min(r, g, b)) / max : 0
  const ramp = (edge: number, x: number) => Math.min(Math.max((x - edge) / PH.softness + HALF, 0), 1)
  const [lr, lg, lb] = PH.luma
  return ramp(PH.key.lum, r * lr + g * lg + b * lb) * (1 - ramp(PH.key.sat, saturation))
}

type Crop = { x: number; y: number; w: number; h: number }

/** A polygon traced by hand in photo coordinates, as a path on a `w` × `h` canvas of the crop. */
function pathOf(points: number[][], crop: Crop, w: number, h: number) {
  const path = new Path2D()
  points.forEach(([x, y], i) => {
    const px = ((x - crop.x) / crop.w) * w
    const py = ((y - crop.y) / crop.h) * h
    if (i) path.lineTo(px, py)
    else path.moveTo(px, py)
  })
  path.closePath()
  return path
}

function canvasOf(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

/**
 * The photo printed on the pass: Hamza cut out of his portrait along the hand-traced outline (the bright wall keyed
 * away inside it, never inside the solid area, so his shirt's white checks stay), feathered, and set on a soft
 * studio backdrop that any keying leftovers simply vanish into. `width` is the photo's size on the texture.
 */
/** The photo decoded off the main thread where the browser can (an ImageBitmap), else as a decoded image. */
async function decodePhoto(url: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    const response = await fetch(url)
    return createImageBitmap(await response.blob())
  }
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()
  return image
}

/** A crop of `source` already scaled to `w` × `h`, made off the main thread when the source is an ImageBitmap. */
async function cropOf(source: ImageBitmap | HTMLImageElement, sx: number, sy: number, sw: number, sh: number, w: number, h: number) {
  if (source instanceof ImageBitmap) return createImageBitmap(source, sx, sy, sw, sh, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
  const canvas = canvasOf(w, h)
  canvas.getContext('2d')?.drawImage(source, sx, sy, sw, sh, 0, 0, w, h)
  return canvas
}

/**
 * The photo printed on the pass, `width` pixels wide on the texture. Its source is a full-resolution head-and-shoulders
 * crop of the portrait (`PH.window` says where it sits in the whole photo, so the hand-traced outline, which is in
 * whole-photo coordinates, still lines up), so the face is drawn down from more pixels than it needs: sharp, never
 * upscaled.
 */
export async function loadIdPhoto(width: number): Promise<Photo> {
  // Decoded, cropped and resized off the main thread: drawing the full photo into a canvas made the browser decode
  // it on the main thread, a long task right as the page opened.
  const source = await decodePhoto(PH.source)
  const [wx0, wy0, wx1, wy1] = PH.window
  // The whole photo's size in this file's pixels, and where the window starts in it.
  const iw = (source instanceof ImageBitmap ? source.width : source.naturalWidth) / (wx1 - wx0)
  const ih = (source instanceof ImageBitmap ? source.height : source.naturalHeight) / (wy1 - wy0)
  const height = Math.round((width * F.photo.h) / F.photo.w)
  const [x0, y0, x1] = PH.crop
  const crop = { x: x0, y: y0, w: x1 - x0, h: ((x1 - x0) * iw * height) / (width * ih) }
  // The cut-out mask is worked out at three quarters of the size (it is feathered anyway), which keeps the per-pixel
  // keying to a few milliseconds while the edges stay clean.
  const mw = Math.round(width * PH.maskScale)
  const mh = Math.round(height * PH.maskScale)
  const [sx, sy, sw, sh] = [(crop.x - wx0) * iw, (crop.y - wy0) * ih, crop.w * iw, crop.h * ih]
  const [full, reduced] = await Promise.all([cropOf(source, sx, sy, sw, sh, width, height), cropOf(source, sx, sy, sw, sh, mw, mh)])
  if (source instanceof ImageBitmap) source.close()
  const person = canvasOf(width, height)
  const pc = person.getContext('2d')
  const small = canvasOf(mw, mh)
  const mask = canvasOf(mw, mh)
  const sc = small.getContext('2d', { willReadFrequently: true })
  const mc = mask.getContext('2d', { willReadFrequently: true })
  if (!pc || !sc || !mc) return null
  pc.drawImage(full, 0, 0)
  sc.drawImage(reduced, 0, 0)
  if (full instanceof ImageBitmap) full.close()
  if (reduced instanceof ImageBitmap) reduced.close()
  mc.fillStyle = '#fff'
  mc.fill(pathOf(PH.solid, crop, mw, mh))
  const solid = mc.getImageData(0, 0, mw, mh).data
  mc.fill(pathOf(PH.outline, crop, mw, mh))
  const pixels = sc.getImageData(0, 0, mw, mh).data
  const keyed = mc.getImageData(0, 0, mw, mh)
  const alpha = keyed.data
  Array.from({ length: mw * mh }, (_, i) => i * RGBA).forEach((at) => {
    if (solid[at + ALPHA]) return
    alpha[at + ALPHA] = alpha[at + ALPHA] * (1 - wallness(pixels[at] / BYTE, pixels[at + 1] / BYTE, pixels[at + BLUE] / BYTE))
  })
  mc.putImageData(keyed, 0, 0)
  pc.globalCompositeOperation = 'destination-in'
  pc.filter = `blur(${PH.feather}px)`
  pc.drawImage(mask, 0, 0, width, height)

  const out = canvasOf(width, height)
  const oc = out.getContext('2d')
  if (!oc) return person
  // A studio backdrop: a soft light behind his head falling off to darker edges, so he stands out from it.
  const [light, edge] = PH.backdrop
  const [lx, ly, reach] = PH.light
  const backdrop = oc.createRadialGradient(width * lx, height * ly, 0, width * lx, height * ly, width * reach)
  backdrop.addColorStop(0, light)
  backdrop.addColorStop(1, edge)
  oc.fillStyle = backdrop
  oc.fillRect(0, 0, width, height)
  // The photo was taken against a bright white wall; a light grade brings his skin and suit back from the glare.
  oc.filter = PH.grade
  oc.drawImage(person, 0, 0)
  return out
}

/* ---------- Drawing ---------- */

/** The printed background every face shares, drawn once per texture size and then copied. */
const backgrounds = new Map<number, HTMLCanvasElement>()

function backgroundFor(width: number, height: number) {
  const cached = backgrounds.get(width)
  if (cached) return cached
  const canvas = canvasOf(width, height)
  const g = canvas.getContext('2d')
  if (!g) return canvas
  const scale = width / FACE_W
  g.setTransform(scale, 0, 0, scale, 0, 0)
  g.fillStyle = C.bg
  g.fillRect(0, 0, FACE_W, FACE_H)
  const sheen = g.createLinearGradient(0, 0, FACE_W, FACE_H)
  F.sheen.stops.forEach((stop, i) => sheen.addColorStop(stop, accentAlpha(F.sheen.alpha[i])))
  g.fillStyle = sheen
  g.fillRect(0, 0, FACE_W, FACE_H)
  const D = F.dots
  const cols = Math.ceil((FACE_W - D.start) / D.step)
  const rows = Math.ceil((FACE_H - D.start) / D.step)
  g.beginPath()
  Array.from({ length: cols * rows }, (_, i) => i).forEach((i) => {
    const x = D.start + (i % cols) * D.step
    const y = D.start + Math.floor(i / cols) * D.step
    g.moveTo(x + D.radius, y)
    g.arc(x, y, D.radius, 0, TAU)
  })
  g.fillStyle = C.dots
  g.fill()
  backgrounds.set(width, canvas)
  return canvas
}

/** Drawing helpers bound to one canvas, already scaled so callers work in the 1100 × 1560 layout. */
function makePen(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')
  if (!g) return null
  const scale = canvas.width / FACE_W
  g.setTransform(scale, 0, 0, scale, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.filter = 'none'
  return {
    font(weight: number, size: number, family: string) {
      g.font = `${weight} ${size}px ${family}`
    },
    width: (text: string) => g.measureText(text).width,
    rect(x: number, y: number, w: number, h: number, color: string) {
      g.fillStyle = color
      g.fillRect(x, y, w, h)
    },
    round(x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lineWidth = 1) {
      g.beginPath()
      g.roundRect(x, y, w, h, r)
      if (fill) {
        g.fillStyle = fill
        g.fill()
      }
      if (stroke) {
        g.strokeStyle = stroke
        g.lineWidth = lineWidth
        g.stroke()
      }
    },
    circle(x: number, y: number, r: number, color: string) {
      g.beginPath()
      g.arc(x, y, r, 0, TAU)
      g.fillStyle = color
      g.fill()
    },
    line(x0: number, y0: number, x1: number, y1: number, color: string, width: number) {
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.strokeStyle = color
      g.lineWidth = width
      g.stroke()
    },
    text(text: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left', baseline: CanvasTextBaseline = 'alphabetic') {
      g.fillStyle = color
      g.textAlign = align
      g.textBaseline = baseline
      g.fillText(text, x, y)
    },
    /** Draws `draw` clipped to a rounded rectangle. */
    clipped(x: number, y: number, w: number, h: number, r: number, draw: () => void) {
      g.save()
      g.beginPath()
      g.roundRect(x, y, w, h, r)
      g.clip()
      draw()
      g.restore()
    },
    image(src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
      g.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh)
    },
    /** A rounded rectangle filled with a diagonal gradient through `colors`. */
    gradientRound(x: number, y: number, w: number, h: number, r: number, colors: string[]) {
      const gradient = g.createLinearGradient(x, y, x + w, y + h)
      colors.forEach((color, i) => gradient.addColorStop(i / Math.max(colors.length - 1, 1), color))
      g.beginPath()
      g.roundRect(x, y, w, h, r)
      g.fillStyle = gradient
      g.fill()
    },
    /** The card's printed background: night blue, a diagonal accent sheen and an engineering dot grid. */
    background() {
      g.drawImage(backgroundFor(canvas.width, canvas.height), 0, 0, FACE_W, FACE_H)
    },
  }
}

type Pen = NonNullable<ReturnType<typeof makePen>>

/** Splits `text` into lines no wider than `width` in the current font. */
function wrap(pen: Pen, text: string, width: number) {
  return text.split(' ').reduce<string[]>((lines, word) => {
    const last = lines.at(-1)
    if (last === undefined) return [word]
    const joined = `${last} ${word}`
    return pen.width(joined) > width ? [...lines, word] : [...lines.slice(0, -1), joined]
  }, [])
}

/** Keeps at most `max` lines, ending the last kept one with an ellipsis when text was cut. */
function clampLines(pen: Pen, lines: string[], max: number, width: number) {
  if (lines.length <= max) return lines
  const last = lines[max - 1]
  const trimmed = pen.width(`${last}${ELLIPSIS}`) <= width ? last : last.split(' ').slice(0, -1).join(' ')
  return [...lines.slice(0, max - 1), `${trimmed}${ELLIPSIS}`]
}

/** Sets the font, shrunk if needed so `text` fits on one line of `width`. */
function fitLine(pen: Pen, text: string, weight: number, size: number, family: string, width: number) {
  pen.font(weight, size, family)
  const measured = pen.width(text)
  if (measured > width) pen.font(weight, Math.floor((size * width) / measured), family)
}

/** The biggest size (within the layout's range) at which `text` fits in the allowed lines; sets that font. */
function fitBig(pen: Pen, text: string) {
  const B = F.big
  const fits = (size: number) => {
    pen.font(HEAVY, size, DISPLAY)
    const lines = wrap(pen, text, F.width)
    return lines.length <= B.lines && lines.every((line) => pen.width(line) <= F.width)
  }
  // A binary search over the allowed sizes (a handful of measurements instead of trying every step from the top).
  const steps = Math.floor((B.max - B.min) / B.step)
  const rounds = Math.ceil(Math.log2(steps + 1))
  const found = Array.from({ length: rounds }).reduce<{ lo: number; hi: number }>(
    ({ lo, hi }) => {
      if (lo >= hi) return { lo, hi }
      const mid = Math.ceil((lo + hi) / DOUBLE)
      return fits(B.min + mid * B.step) ? { lo: mid, hi } : { lo, hi: mid - 1 }
    },
    { lo: 0, hi: steps },
  )
  const size = B.min + found.lo * B.step
  pen.font(HEAVY, size, DISPLAY)
  return { size, lines: wrap(pen, text, F.width).slice(0, B.lines) }
}

/** An outlined pill (optionally with a status dot); returns its width. */
function pill(pen: Pen, x: number, y: number, label: string, color: string, dot = false) {
  const P = F.pills
  pen.font(SEMI, P.font, MONO)
  const inset = dot ? P.dotSpace : 0
  const w = pen.width(label) + inset + P.padX * DOUBLE
  pen.round(x, y, w, P.h, P.h * HALF, undefined, color, P.stroke)
  if (dot) pen.circle(x + P.padX + P.dot, y + P.h * HALF, P.dot, color)
  pen.text(label, x + P.padX + inset, y + P.h * HALF, color, 'left', 'middle')
  return w
}

/** Small outlined tags that wrap onto at most `rows` rows from `top`; returns the bottom of the last row. */
function tags(pen: Pen, labels: string[], top: number, rows: number) {
  const G = F.tags
  pen.font(SEMI, G.font, MONO)
  type Placed = { label: string; x: number; w: number; row: number }
  const laid = labels.reduce<{ x: number; row: number; items: Placed[] }>(
    (acc, label) => {
      const w = pen.width(label) + G.padX * DOUBLE
      const wraps = acc.x > F.pad && acc.x + w > F.pad + F.width
      const x = wraps ? F.pad : acc.x
      const row = wraps ? acc.row + 1 : acc.row
      return { x: x + w + G.gap, row, items: [...acc.items, { label, x, w, row }] }
    },
    { x: F.pad, row: 0, items: [] },
  )
  const shown = laid.items.filter((item) => item.row < rows)
  shown.forEach((item) => {
    const y = top + item.row * (G.h + G.rowGap)
    pen.round(item.x, y, item.w, G.h, G.h * HALF, undefined, accent, G.stroke)
    pen.font(SEMI, G.font, MONO)
    pen.text(item.label, item.x + G.padX, y + G.h * HALF, accent, 'left', 'middle')
  })
  const used = shown.reduce((most, item) => Math.max(most, item.row + 1), 0)
  return top + used * (G.h + G.rowGap)
}

function barcode(pen: Pen, seed: number) {
  const B = F.barcode
  Array.from({ length: B.limit }, (_, i) => i).reduce((x, i) => {
    if (x >= B.end) return x
    const bar = B.bar * (1 + Math.floor(random01(seed + i, BARCODE_CHANNEL) * B.barSteps))
    pen.rect(x, B.y, bar, B.h, C.barcode)
    return x + bar + B.gap + Math.floor(random01(seed + i, GAP_CHANNEL) * B.gapSteps) * B.bar
  }, F.pad)
}

function bigPhoto(pen: Pen, photo: Photo) {
  const P = F.photo
  pen.clipped(P.x, P.y, P.w, P.h, P.r, () => (photo ? pen.image(photo, 0, 0, photo.width, photo.height, P.x, P.y, P.w, P.h) : pen.rect(P.x, P.y, P.w, P.h, C.faint)))
  pen.round(P.x, P.y, P.w, P.h, P.r, undefined, accentAlpha(F.strokeAlpha), P.stroke)
}

/** A small square of the photo, around his face, for the job and student passes. */
function thumb(pen: Pen, photo: Photo) {
  const P = F.photo
  const S = F.thumb
  const [cx, cy, size] = S.crop
  pen.clipped(P.x, P.y, S.size, S.size, S.r, () =>
    photo ? pen.image(photo, cx * photo.width, cy * photo.width, size * photo.width, size * photo.width, P.x, P.y, S.size, S.size) : pen.rect(P.x, P.y, S.size, S.size, C.faint),
  )
  pen.round(P.x, P.y, S.size, S.size, S.r, undefined, accentAlpha(F.strokeAlpha), P.stroke)
}

type SideRow = { label: string; value: string; mono?: boolean }

/** Label-and-value rows beside the small photo, then an optional pill. */
function sideColumn(pen: Pen, rows: SideRow[], badge?: string) {
  const S = F.side
  const bottom = rows.reduce((y, row) => {
    pen.font(MEDIUM, S.labelFont, MONO)
    pen.text(row.label.toUpperCase(), S.x, y + S.labelFont, C.muted)
    const size = row.mono ? S.monoFont : S.valueFont
    pen.font(row.mono ? MEDIUM : SEMI, size, row.mono ? MONO : DISPLAY)
    const lines = clampLines(pen, wrap(pen, row.value, S.width), S.lines, S.width)
    lines.forEach((line, i) => pen.text(line, S.x, y + S.labelGap + size * F.big.cap + i * S.valueLine, C.ink))
    return y + S.labelGap + lines.length * S.valueLine + S.blockGap
  }, F.photo.y)
  if (badge) pill(pen, S.x, bottom, badge, accent)
}

/** An accent eyebrow over a big heading fitted to the card; returns the heading's last baseline. */
function bigBlock(pen: Pen, eyebrow: string, text: string) {
  const B = F.big
  pen.font(SEMI, F.eyebrow.font, MONO)
  pen.text(eyebrow.toUpperCase(), F.pad, B.top, accent)
  const fit = fitBig(pen, text)
  const first = B.top + F.eyebrow.gap + fit.size * B.cap
  fit.lines.forEach((line, i) => pen.text(line, F.pad, first + i * fit.size * B.lineHeight, C.ink))
  return first + (fit.lines.length - 1) * fit.size * B.lineHeight
}

function bodyText(pen: Pen, text: string, top: number) {
  const B = F.body
  pen.font(MEDIUM, B.font, DISPLAY)
  clampLines(pen, wrap(pen, text, F.width), B.lines, F.width).forEach((line, i) => pen.text(line, F.pad, top + i * B.line, C.muted))
}

function title(pen: Pen, text: string) {
  fitLine(pen, text, HEAVY, F.title.size, DISPLAY, F.width)
  pen.text(text, F.pad, F.title.y, C.ink)
}

/**
 * Security microtext: a line of tiny repeated print across the card, the way real passes carry it. `y` is the
 * baseline; it runs from edge to edge between the margins.
 */
function microtext(pen: Pen, y: number) {
  const M = F.micro
  const unit = `${profile.githubUser}  ·  ${T.role}  ·  ${T.kicker}  ·  `.toUpperCase()
  pen.font(MEDIUM, M.font, MONO)
  const line = unit.repeat(Math.ceil(F.width / Math.max(pen.width(unit), 1)) + 1)
  pen.clipped(F.pad, y - M.font, F.width, M.font * DOUBLE, 0, () => pen.text(line, F.pad, y, inkAlpha(M.alpha)))
}

/** A real QR code, printed module by module, that opens his GitHub when scanned (the pattern is in passFace.json). */
function qrCode(pen: Pen) {
  const B = F.badge
  const Q = B.qr
  const count = Q.rows.length + Q.quiet * DOUBLE
  const cell = B.size / count
  pen.round(B.x, B.y, B.size, B.size, Q.radius, Q.paper)
  Q.rows.forEach((row, r) =>
    Array.from(row).forEach((bit, c) => {
      if (bit === '1') pen.rect(B.x + (c + Q.quiet) * cell, B.y + (r + Q.quiet) * cell, cell + FILL_OVERLAP, cell + FILL_OVERLAP, Q.ink)
    }),
  )
}

function statusPill(pen: Pen, x: number, y: number) {
  return pill(pen, x, y, (available ? T.available : T.busy).toUpperCase(), available ? C.ok : C.busy, true)
}

/* ---------- The faces ---------- */

type Spec = { kicker: string; sub: string; seed: string; footer: string[]; body: (pen: Pen, photo: Photo) => void }

const specs: Record<string, (index: number) => Spec> = {
  id: () => ({
    kicker: T.kicker,
    sub: `${T.serial} · ${year}`,
    seed: profile.name,
    footer: [`commit ${fakeHash(profile.name)}`, `branch ${T.branch}`],
    body: (pen, photo) => {
      bigPhoto(pen, photo)
      pen.font(HEAVY, F.name.size, DISPLAY)
      pen.text(profile.shortName, F.name.x, F.name.y, C.ink)
      pen.font(SEMI, F.role.size, DISPLAY)
      pen.text(T.role, F.pad, F.role.y, accent)
      const first = pill(pen, F.pad, F.pills.y, T.access.toUpperCase(), accent)
      statusPill(pen, F.pad + first + F.pills.gap, F.pills.y)
      qrCode(pen)
    },
  }),

  back: () => ({
    kicker: T.kicker,
    sub: T.back,
    seed: profile.githubUser,
    footer: [`commit ${fakeHash(profile.githubUser)}`, `branch ${T.branch}`],
    body: (pen) => {
      const K = F.back
      pen.round(F.pad, F.photo.y, K.tile, K.tile, K.tileRadius, C.ink)
      pen.font(HEAVY, K.tileFont, DISPLAY)
      pen.text(profile.initials, F.pad + K.tile * HALF, F.photo.y + K.tile * HALF, C.tileInk, 'center', 'middle')
      pen.font(MEDIUM, K.linkFont, MONO)
      pen.text(T.github, K.textX, K.linkY, C.muted)
      fitLine(pen, profile.githubUser, BOLD, K.handleFont, DISPLAY, F.right - K.textX)
      pen.text(profile.githubUser, K.textX, K.handleY, C.ink)
      statusPill(pen, F.pad, K.pillY)
      bodyText(pen, profile.availability.detail, K.detailY)
      tags(pen, home.stack, K.stackTop, K.stackRows)
      pen.font(MEDIUM, F.hint.font, MONO)
      pen.text(T.flipBack, F.pad, K.hintY, C.muted)
    },
  }),

  job: (index) => {
    const job = experience[index] ?? experience[0]
    return {
      kicker: T.jobKicker,
      sub: `${pad2(index + 1)} / ${pad2(experience.length)}`,
      seed: job.org,
      footer: [`commit ${fakeHash(job.org + job.role)}`, `feat/${branchSlug(job.org)}`],
      body: (pen, photo) => {
        thumb(pen, photo)
        sideColumn(
          pen,
          [
            { label: T.labels.role, value: job.role },
            { label: T.labels.period, value: job.period, mono: true },
          ],
          job.type.toUpperCase(),
        )
        const bottom = bigBlock(pen, job.period.includes(T.present) ? T.worksAt : T.workedAt, job.org)
        bodyText(pen, job.summary, bottom + F.body.gap)
        tags(pen, job.stack, F.tags.top, 1)
      },
    }
  },

  edu: () => {
    const school = education[0]
    return {
      kicker: T.studentKicker,
      sub: school.period,
      seed: school.school,
      footer: [`commit ${fakeHash(school.school + school.degree)}`, `edu/${branchSlug(school.degree)}`],
      body: (pen, photo) => {
        thumb(pen, photo)
        sideColumn(
          pen,
          [
            { label: T.labels.degree, value: school.degree },
            { label: T.labels.period, value: school.period, mono: true },
          ],
          school.detail.toUpperCase(),
        )
        bigBlock(pen, T.studiesAt, school.school)
        tags(pen, school.focus, F.tags.top - (F.tags.h + F.tags.rowGap), DOUBLE)
      },
    }
  },

  stack: () => ({
    kicker: T.stackKicker,
    sub: `${pad2(skills.tools.length)} ${T.toolsUnit}`,
    seed: T.stackTitle,
    footer: [`commit ${fakeHash(T.stackTitle)}`, `branch ${T.branch}`],
    body: (pen) => {
      title(pen, T.stackTitle)
      const G = F.groups
      skills.groups.reduce((y, group) => {
        pen.font(MEDIUM, G.labelFont, MONO)
        pen.text(group.label.toUpperCase(), F.pad, y, C.muted)
        return tags(
          pen,
          group.items.map((item) => item.name),
          y + G.labelGap,
          G.rows,
        ) + G.gap
      }, F.list.y)
    },
  }),

  principles: () => ({
    kicker: T.principlesKicker,
    sub: `${pad2(about.principles.items.length)} ${T.rulesUnit}`,
    seed: about.principles.title,
    footer: [`commit ${fakeHash(about.principles.title)}`, `docs/${branchSlug(about.principles.title)}`],
    body: (pen) => {
      title(pen, about.principles.title)
      const L = F.list
      about.principles.items.forEach((item, i) => {
        const y = L.y + i * L.row
        pen.font(MEDIUM, L.numberFont, MONO)
        pen.text(pad2(i + 1), F.pad, y, accent)
        fitLine(pen, item.title, SEMI, L.titleFont, DISPLAY, F.right - L.titleX)
        pen.text(item.title, L.titleX, y, C.ink)
        pen.line(F.pad, y + L.ruleOffset, F.right, y + L.ruleOffset, C.faint, L.rule)
      })
    },
  }),

  now: () => ({
    kicker: T.nowKicker,
    sub: `${year}`,
    seed: about.now.title,
    footer: [`commit ${fakeHash(about.now.title)}`, `branch ${T.branch}`],
    body: (pen) => {
      title(pen, about.now.eyebrow)
      const B = F.blocks
      about.now.items.reduce((y, item) => {
        pen.font(SEMI, B.labelFont, MONO)
        pen.text(item.label.toUpperCase(), F.pad, y, accent)
        pen.font(MEDIUM, B.textFont, DISPLAY)
        const lines = clampLines(pen, wrap(pen, item.text, F.width), B.lines, F.width)
        lines.forEach((line, i) => pen.text(line, F.pad, y + B.labelGap + i * B.line, C.ink))
        return y + B.labelGap + lines.length * B.line + B.gap
      }, B.y)
    },
  }),
}

/** The card chrome every face shares: background, clip slot, header, barcode and commit footer. */
function frame(pen: Pen, spec: Spec) {
  pen.background()
  microtext(pen, F.micro.top)
  microtext(pen, F.micro.bottom)
  const S = F.slot
  pen.round(S.x - S.w * HALF, S.y - S.h * HALF, S.w, S.h, S.h * HALF, C.slot)
  const H = F.header
  pen.round(F.pad, H.y, H.tile, H.tile, H.tileRadius, C.ink)
  pen.font(HEAVY, H.tileFont, DISPLAY)
  pen.text(profile.initials, F.pad + H.tile * HALF, H.y + H.tile * HALF, C.tileInk, 'center', 'middle')
  pen.font(SEMI, H.kickerFont, MONO)
  pen.text(spec.kicker.toUpperCase(), F.right, H.kickerY, C.ink, 'right')
  pen.font(MEDIUM, H.subFont, MONO)
  pen.text(spec.sub, F.right, H.subY, C.muted, 'right')
  barcode(pen, seedOf(spec.seed))
  pen.font(MEDIUM, F.footer.font, MONO)
  spec.footer.forEach((line, i) => pen.text(line, F.right, F.footer.y + i * F.footer.line, C.muted, 'right'))
}

/**
 * Draws face `key` ("id", "back", "job-0", "edu", "stack", "principles" or "now") into `canvas`, at whatever size
 * the canvas is. Unknown keys draw the ID.
 */
export function paintFace(canvas: HTMLCanvasElement, key: string, photo: Photo) {
  const pen = makePen(canvas)
  if (!pen) return
  const [kind, index] = key.split('-')
  const spec = (specs[kind] ?? specs.id)(Number(index ?? 0))
  frame(pen, spec)
  spec.body(pen, photo)
}

/** The texture's pixel height for a given width, keeping the card's proportions. */
export const faceHeight = (width: number) => Math.round((width * FACE_H) / FACE_W)

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group, MathUtils, Points, ShaderMaterial } from 'three'
import config from '../scene.json'
import { portalFragment, portalVertex } from '../portalShaders'
import { useFontsVersion, useHalfWidth, useNarrow } from '../kit'
import { scrollState } from '../../lib/scroll'
import { journey } from '../../lib/journey'
import { useQuality } from '../../lib/quality'
import { HALF, TAU, clamp } from '../../lib/math'

const P = config.portal
const XYZ = 3
const ATLAS_CELLS = 4
/** Fifteen code glyphs plus one solid "voxel" square fill the 4×4 atlas. */
const GLYPHS = ['{', '}', '<', '>', '/', ';', '=', '(', ')', '[', ']', '0', '1', '#', '*']
const VOXEL = GLYPHS.length
const VISIBLE = 0.01

const ease = (x: number) => x * x * (P.smoothA - P.smoothB * x)
const cellCentre = (i: number) => [(i % ATLAS_CELLS) + HALF, Math.floor(i / ATLAS_CELLS) + HALF] as const

/** White glyphs on a transparent canvas, one per cell; the shader tints them. */
function glyphAtlas() {
  const cell = P.glyphPx
  const canvas = document.createElement('canvas')
  canvas.width = cell * ATLAS_CELLS
  canvas.height = cell * ATLAS_CELLS
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${cell * P.glyphScale}px "Geist Mono", ui-monospace, monospace`
    GLYPHS.forEach((glyph, i) => {
      const [cx, cy] = cellCentre(i)
      ctx.fillText(glyph, cx * cell, cy * cell)
    })
    const [vx, vy] = cellCentre(VOXEL)
    const side = cell * P.voxelScale
    ctx.fillRect(vx * cell - side * HALF, vy * cell - side * HALF, side, side)
  }
  return new CanvasTexture(canvas)
}

function buildGeometry(count: number) {
  const geometry = new BufferGeometry()
  const attribute = (make: () => number) => new BufferAttribute(Float32Array.from({ length: count }, make), 1)
  // The shader places every point itself; three still needs a position attribute to know how many to draw.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * XYZ), XYZ))
  // Points gather into a few arms; the shader twists each arm with depth, so head-on they read as a vortex.
  geometry.setAttribute('aAngle', attribute(() => (Math.floor(Math.random() * P.arms) / P.arms) * TAU + (Math.random() - HALF) * P.armSpread))
  // Most points line the tunnel wall; a few drift through the middle so it never reads as an empty pipe.
  geometry.setAttribute(
    'aRadius',
    attribute(() => (Math.random() < P.coreShare ? P.coreMin + Math.random() * (P.coreMax - P.coreMin) : 1 + (Math.random() - HALF) * P.wall)),
  )
  geometry.setAttribute('aDepth', attribute(Math.random))
  geometry.setAttribute('aGlyph', attribute(() => (Math.random() < P.voxelShare ? VOXEL : Math.floor(Math.random() * GLYPHS.length))))
  geometry.setAttribute('aSeed', attribute(Math.random))
  return geometry
}

/**
 * Home: a portal of code glyphs. In the intro it swirls beside your name; as you scroll into the laptop the camera
 * flies down the tunnel while the glyphs rush past, then it fades away for the middle of the page and gathers again
 * behind the closing "let's build" section. Reads `journey` (written by the Home page's scroll triggers).
 */
export function CodePortal() {
  const narrow = useNarrow()
  const half = useHalfWidth(0)
  const quality = useQuality()
  const dpr = useThree((s) => s.viewport.dpr)
  const aspect = useThree((s) => s.size.width / s.size.height)
  // On narrower desktop windows the intro portal shrinks a little, so it stays clear of the text beside it.
  const heroScale = narrow ? 1 : clamp(aspect / P.hero.refAspect, P.hero.minScale, 1)
  const fonts = useFontsVersion()
  const count = P.counts[quality === 'high' ? 'high' : 'medium'][narrow ? 1 : 0]

  const outer = useRef<Group>(null)
  const points = useRef<Points>(null)
  const phase = useRef({ flow: 0, spin: 0 })

  const geometry = useMemo(() => buildGeometry(count), [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uSpin: { value: 0 },
      uLength: { value: P.length },
      uRadius: { value: P.radius },
      uTwist: { value: P.twist },
      uSize: { value: P.size },
      uMaxSize: { value: P.maxSize },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0 },
      uAtlas: { value: null as CanvasTexture | null },
      uBase: { value: new Color(config.palette.line) },
      uAccent: { value: new Color(config.palette.accent) },
      uAccentRatio: { value: P.accentRatio },
    }),
    [],
  )
  // Built here rather than declared in JSX: R3F copies a `uniforms` prop into a new object, so the per-frame
  // writes below would never reach the shader.
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: portalVertex,
        fragmentShader: portalFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [uniforms],
  )
  useEffect(() => () => material.dispose(), [material])

  // Glyphs are drawn with the site's mono font, so the atlas is redrawn once web fonts have loaded.
  useEffect(() => {
    const atlas = glyphAtlas()
    uniforms.uAtlas.value = atlas
    return () => atlas.dispose()
  }, [fonts, uniforms])
  useEffect(() => {
    uniforms.uPixelRatio.value = dpr
  }, [dpr, uniforms])

  useFrame((state, delta) => {
    const o = outer.current
    const p = points.current
    if (!o || !p) return
    const dive = journey.dive
    const finale = ease(clamp(journey.finale, 0, 1))
    const d = ease(clamp(dive, 0, 1))
    const diving = dive < 1

    // Intro and dive: from beside the name to straight ahead, then through the mouth of the tunnel.
    const start = narrow ? P.mobile : P.hero
    const dimmed = narrow ? P.mobileOpacity : 1
    const intro = {
      x: MathUtils.lerp(start.x * half, 0, d),
      y: MathUtils.lerp(start.y, 0, d),
      z: P.diveZ * d * d,
      rx: MathUtils.lerp(P.hero.rotX, 0, d),
      ry: MathUtils.lerp(start.rotY, 0, d),
      scale: MathUtils.lerp(heroScale, 1, d),
      opacity: MathUtils.lerp(dimmed, 1, d) * (1 - clamp((dive - P.diveFadeFrom) / (1 - P.diveFadeFrom), 0, 1)),
    }
    // After the dive it stays hidden until the closing section, where it gathers again from far away.
    const outro = { x: 0, y: P.finaleY, z: MathUtils.lerp(P.finaleZ, 0, finale), rx: P.finaleRotX, ry: 0, scale: 1, opacity: finale * dimmed }
    const pose = diving ? intro : outro

    o.position.set(pose.x, pose.y, pose.z)
    o.scale.setScalar(pose.scale)
    o.rotation.set(pose.rx + scrollState.pointerY * P.pointerTilt, pose.ry + scrollState.pointerX * P.pointerTilt, 0)
    p.visible = pose.opacity > VISIBLE

    const rush = diving ? d : 0
    phase.current.flow += delta * MathUtils.lerp(P.flow, P.diveFlow, rush)
    phase.current.spin += delta * MathUtils.lerp(P.spin, P.diveSpin, rush)
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uFlow.value = phase.current.flow
    uniforms.uSpin.value = phase.current.spin
    uniforms.uOpacity.value = pose.opacity * P.opacity
  })

  return (
    <group ref={outer}>
      <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

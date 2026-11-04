import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, MathUtils, Plane, Raycaster, ShaderMaterial, Vector2, Vector3 } from 'three'
import config from '../scene.json'
import { galaxyFragment, galaxyVertex } from '../galaxyShaders'
import { useHalfWidth, useNarrow } from '../kit'
import { scrollState } from '../../lib/scroll'
import { useQuality } from '../../lib/quality'
import { DOUBLE, HALF, TAU, clamp } from '../../lib/math'

const G = config.galaxy
const XYZ = 3
const GOLDEN_ANGLE = 2.399963229728653
const FAR_AWAY = 1e4
const formEase = gsap.parseEase('power2.inOut')
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

type Point = [number, number, number]
const rand = (scale = 1) => (Math.random() - HALF) * scale

function fibonacciPoint(i: number, total: number, radius: number): Point {
  const y = 1 - (i / Math.max(total - 1, 1)) * DOUBLE
  const ring = Math.sqrt(1 - y * y)
  const theta = GOLDEN_ANGLE * i
  return [Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius]
}

/** A loose ball of points: where the galaxy gathers from when the page opens. */
const cloud = (count: number) =>
  Array.from({ length: count }, (): Point => fibonacciPoint(Math.floor(Math.random() * count), count, G.cloudRadius * Math.cbrt(Math.random())))

/** A spiral galaxy disk: a dense core and arms that wind tighter towards the middle. */
const spiral = (count: number) =>
  Array.from({ length: count }, (): Point => {
    if (Math.random() < G.coreShare) {
      const [x, y, z] = fibonacciPoint(Math.floor(Math.random() * count), count, G.coreRadius * Math.random())
      return [x, y * HALF, z]
    }
    const r = Math.pow(Math.random(), G.falloff) * G.radius
    const arm = (Math.floor(Math.random() * G.arms) / G.arms) * TAU
    const angle = arm + (r / G.radius) * G.twist * Math.PI + rand(G.spread * (1 - r / G.radius + HALF))
    return [Math.cos(angle) * r, rand(G.thickness * (1 - r / G.radius)), Math.sin(angle) * r]
  })

function buildGeometry(count: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(cloud(count).flat()), XYZ))
  geometry.setAttribute('aTo', new BufferAttribute(Float32Array.from(spiral(count).flat()), XYZ))
  geometry.setAttribute('aDelay', new BufferAttribute(Float32Array.from({ length: count }, Math.random), 1))
  geometry.setAttribute('aSeed', new BufferAttribute(Float32Array.from({ length: count }, Math.random), 1))
  return geometry
}

/**
 * Projects: a spiral galaxy of particles, "straight from my GitHub". It gathers out of a loose cloud when the page
 * opens, spins slowly, rises and fades as you scroll, scatters when you scroll fast and parts around the pointer.
 * Dragging the repo ring on the page spins it too.
 */
export function Galaxy() {
  const narrow = useNarrow()
  const half = useHalfWidth(G.z)
  const quality = useQuality()
  const camera = useThree((s) => s.camera)
  const dpr = useThree((s) => s.viewport.dpr)
  const count = G.counts[quality === 'high' ? 'high' : 'medium'][narrow ? 1 : 0]

  const outer = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const formStart = useRef(-1)
  const frames = useRef(0)
  const geometry = useMemo(() => buildGeometry(count), [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uStagger: { value: G.formStagger },
      uTime: { value: 0 },
      uSize: { value: G.size },
      uPixelRatio: { value: 1 },
      uScatter: { value: G.idleScatter },
      uSwirl: { value: G.formSwirl },
      uOpacity: { value: 1 },
      uPointer: { value: new Vector3(FAR_AWAY, FAR_AWAY, FAR_AWAY) },
      uPointerRadius: { value: G.pointerRadius },
      uPointerForce: { value: canHover ? G.pointerForce : 0 },
      uBase: { value: new Color(config.palette.line) },
      uAccent: { value: new Color(config.palette.accent) },
      uAccentRatio: { value: G.accentRatio },
    }),
    [],
  )
  // Built here rather than declared in JSX: R3F copies a `uniforms` prop into a new object, so the per-frame
  // writes below would never reach the shader.
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: galaxyVertex,
        fragmentShader: galaxyFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [uniforms],
  )
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    uniforms.uPixelRatio.value = dpr
  }, [dpr, uniforms])

  const plane = useMemo(() => new Plane(new Vector3(0, 0, 1), 0), [])
  const raycaster = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])
  const hit = useMemo(() => new Vector3(), [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const o = outer.current
    const s = spin.current
    if (!o || !s) return
    uniforms.uTime.value = t

    // The galaxy gathers once its slot has compiled and become visible, not while it is still hidden. The slot
    // only hides it from its own first frame on, so the very first frame doesn't count.
    frames.current += 1
    if (formStart.current < 0 && frames.current > 1 && o.parent?.visible) formStart.current = t
    uniforms.uProgress.value = formStart.current < 0 ? 0 : formEase(clamp((t - formStart.current) / G.formDuration, 0, 1))

    const progress = scrollState.progress
    const fling = clamp(Math.abs(scrollState.velocity) / G.velocityForFullScatter, 0, 1)
    uniforms.uScatter.value = MathUtils.damp(uniforms.uScatter.value, G.idleScatter + fling * G.maxScatter, G.scatterDamping, delta)
    uniforms.uOpacity.value = 1 - progress * (narrow ? G.mobileFade : G.fade)

    const place = narrow ? G.mobile : G
    o.position.set(place.x * half, place.y + progress * G.rise, G.z)
    o.scale.setScalar(place.scale)
    o.rotation.set(G.tilt[0], G.tilt[1], G.tilt[2])
    s.rotation.y = t * G.idleSpin + progress * G.turn + scrollState.spin

    // Points part around the pointer: find where it meets the galaxy's plane, in the galaxy's own space.
    ndc.set(scrollState.pointerX, scrollState.pointerY)
    raycaster.setFromCamera(ndc, camera)
    plane.constant = -G.z
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(s.worldToLocal(hit))
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        <points geometry={geometry} material={material} frustumCulled={false} />
      </group>
    </group>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  MathUtils,
  NormalBlending,
  Plane,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import config from './scene.json'
import { getShape, POINT_STRIDE, type ShapeName } from './shapes'
import { sculptureFragment, sculptureVertex } from './shaders'
import { scrollState } from '../lib/scroll'
import { useTheme } from '../lib/theme'
import { HALF, clamp } from '../lib/math'

export type PageKey = keyof typeof config.pages

const P = config.particles
const MORPH_STAGGER = 0.4
const SMOOTH_A = 3
const SMOOTH_B = 2
const SCATTER_DAMPING = 3
const FAR_AWAY = 1e4
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

export const useNarrow = () => useThree((s) => s.size.width / s.size.height < config.narrowAspect)

export function resolvePage(pathname: string): PageKey {
  const clean = `/${pathname.split('/').filter(Boolean).join('/')}`
  return clean in config.pages ? (clean as PageKey) : '*'
}

/** Where each particle currently sits, replicating the shader's staggered blend so a new morph starts seamlessly. */
function blendPositions(from: ArrayLike<number>, to: ArrayLike<number>, delays: ArrayLike<number>, progress: number) {
  if (progress >= 1) return Float32Array.from(to)
  return Float32Array.from(from, (v, i) => {
    const raw = clamp((progress - delays[Math.floor(i / POINT_STRIDE)] * MORPH_STAGGER) / (1 - MORPH_STAGGER), 0, 1)
    const eased = raw * raw * (SMOOTH_A - SMOOTH_B * raw)
    return v + (to[i] - v) * eased
  })
}

function buildGeometry(count: number) {
  const start = getShape('scatter', count)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(start.slice(), POINT_STRIDE))
  geometry.setAttribute('aTo', new BufferAttribute(start.slice(), POINT_STRIDE))
  geometry.setAttribute('aDelay', new BufferAttribute(Float32Array.from({ length: count }, Math.random), 1))
  geometry.setAttribute('aSeed', new BufferAttribute(Float32Array.from({ length: count }, Math.random), 1))
  return geometry
}

export function Sculpture({ page }: { page: PageKey }) {
  const narrow = useNarrow()
  const theme = useTheme()
  const camera = useThree((s) => s.camera)
  const dpr = useThree((s) => s.viewport.dpr)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const count = narrow ? P.mobile : P.desktop

  const outer = useRef<Group>(null)
  const tilt = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const layout = useRef({ x: 0, y: 0, z: 0, scale: 1, rx: 0, ry: 0, rz: 0 })

  const geometry = useMemo(() => buildGeometry(count), [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 1 },
      uTime: { value: 0 },
      uSize: { value: P.size },
      uPixelRatio: { value: 1 },
      uScatter: { value: P.idleScatter },
      uSwirl: { value: P.morphSwirl },
      uOpacity: { value: 1 },
      uPointer: { value: new Vector3(FAR_AWAY, FAR_AWAY, FAR_AWAY) },
      uPointerRadius: { value: P.pointerRadius },
      uPointerForce: { value: canHover ? P.pointerForce : 0 },
      uBase: { value: new Color() },
      uAccent: { value: new Color() },
      uAccentRatio: { value: P.accentRatio },
    }),
    [],
  )

  useEffect(() => {
    uniforms.uPixelRatio.value = dpr
  }, [dpr, uniforms])

  useEffect(() => {
    const palette = config.palette[theme]
    uniforms.uBase.value.set(palette.base)
    uniforms.uAccent.value.set(palette.accent)
    if (!material.current) return
    material.current.blending = theme === 'dark' ? AdditiveBlending : NormalBlending
    material.current.needsUpdate = true
  }, [theme, uniforms])

  useEffect(() => {
    const target = getShape(config.pages[page].shape as ShapeName, count)
    const position = geometry.getAttribute('position') as BufferAttribute
    const to = geometry.getAttribute('aTo') as BufferAttribute
    const delays = geometry.getAttribute('aDelay').array
    const current = blendPositions(position.array, to.array, delays, uniforms.uProgress.value)
    ;(position.array as Float32Array).set(current)
    ;(to.array as Float32Array).set(target)
    position.needsUpdate = true
    to.needsUpdate = true
    uniforms.uProgress.value = 0
    const tween = gsap.to(uniforms.uProgress, { value: 1, duration: P.morphDuration, ease: 'power2.inOut' })
    return () => {
      tween.kill()
    }
  }, [page, count, geometry, uniforms])

  useEffect(() => {
    const cfg = config.pages[page]
    const place = narrow ? cfg.mobile : cfg
    const halfWidth =
      Math.tan(MathUtils.degToRad(config.camera.fov) * HALF) * (config.camera.z - place.z) * aspect
    const tween = gsap.to(layout.current, {
      x: place.x * halfWidth,
      y: place.y,
      z: place.z,
      scale: place.scale,
      rx: cfg.tilt[0],
      ry: cfg.tilt[1],
      rz: cfg.tilt[2],
      duration: P.layoutDuration,
      ease: 'expo.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [page, narrow, aspect])

  const plane = useMemo(() => new Plane(new Vector3(0, 0, 1), 0), [])
  const raycaster = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])
  const hit = useMemo(() => new Vector3(), [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const progress = scrollState.progress
    const l = layout.current
    uniforms.uTime.value = t
    const scatterTarget =
      P.idleScatter + clamp(Math.abs(scrollState.velocity) / P.velocityForFullScatter, 0, 1) * P.maxScatter
    uniforms.uScatter.value = MathUtils.damp(uniforms.uScatter.value, scatterTarget, SCATTER_DAMPING, delta)
    uniforms.uOpacity.value = 1 - progress * (narrow ? config.scroll.mobileFade : config.scroll.fade)

    if (!outer.current || !tilt.current || !spin.current) return
    outer.current.position.set(l.x, l.y + progress * config.scroll.rise, l.z)
    outer.current.scale.setScalar(l.scale)
    tilt.current.rotation.set(l.rx, l.ry, l.rz)
    spin.current.rotation.y = t * P.idleSpin + progress * config.scroll.turn + scrollState.spin

    ndc.set(scrollState.pointerX, scrollState.pointerY)
    raycaster.setFromCamera(ndc, camera)
    plane.constant = -l.z
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(spin.current.worldToLocal(hit))
  })

  return (
    <group ref={outer}>
      <group ref={tilt}>
        <group ref={spin}>
          <points geometry={geometry} frustumCulled={false}>
            <shaderMaterial
              ref={material}
              vertexShader={sculptureVertex}
              fragmentShader={sculptureFragment}
              uniforms={uniforms}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </points>
        </group>
      </group>
    </group>
  )
}

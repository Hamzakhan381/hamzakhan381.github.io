import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points } from 'three'
import layout from './layout.json'
import { particleFragment, particleVertex } from './shaders'
import { sceneState, useNarrow } from './rig'
import { TAU } from '../lib/math'

const { particles: cfg, fog } = layout
const CLEAR_PATH_RADIUS = 1.8
const DRIFT_SPEED = 0.012
const MIN_SCALE = 0.35
const SCALE_RANGE = 1.1
const FADE_FAR = fog.far + fog.near

function buildGeometry(count: number) {
  const points = Array.from({ length: count }, () => {
    const radius = CLEAR_PATH_RADIUS + Math.sqrt(Math.random()) * cfg.spread
    const angle = Math.random() * TAU
    const z = cfg.front - Math.random() * (cfg.front + cfg.back)
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, z]
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(points.flat()), points[0].length))
  geometry.setAttribute(
    'aScale',
    new BufferAttribute(Float32Array.from(points, () => MIN_SCALE + Math.random() * SCALE_RANGE), 1),
  )
  geometry.setAttribute('aSeed', new BufferAttribute(Float32Array.from(points, () => Math.random()), 1))
  return geometry
}

export function Particles() {
  const narrow = useNarrow()
  const dpr = useThree((s) => s.viewport.dpr)
  const ref = useRef<Points>(null)
  const geometry = useMemo(() => buildGeometry(narrow ? cfg.mobile : cfg.desktop), [narrow])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: cfg.size },
      uPixelRatio: { value: dpr },
      uWarp: { value: 0 },
      uFogNear: { value: fog.near },
      uFogFar: { value: FADE_FAR },
      uColorA: { value: new Color('#4facfe') },
      uColorB: { value: new Color('#8b5cf6') },
    }),
    [dpr],
  )

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uWarp.value = sceneState.warp
    if (ref.current) ref.current.rotation.z += delta * DRIFT_SPEED
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

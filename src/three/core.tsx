import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, Group, MathUtils, Mesh } from 'three'
import layout from './layout.json'
import { coreFragment, coreVertex } from './shaders'
import { sceneState, useNarrow, useStationVisibility } from './rig'
import { HALF, HALF_PI, clamp, peak } from '../lib/math'

const { core } = layout
const STATION = 0
const VISIBLE_RANGE = 1.6
const BASE_AMP = 0.22
const SCROLL_AMP = 0.9
const WARP_AMP = 0.25
const NOISE_FREQ = 0.75
const IDLE_SPIN = 0.12
const SCROLL_SPIN = 1.6
const POINTER_TILT = 0.35
const SHELL_DETAIL = 1
const SHELL_OPACITY = 0.18
const RING_OPACITY = 0.55
const RING_SEGMENTS = 160
const RING_RADIAL = 8
const SATELLITE_SIZE = 0.07
const SATELLITE_SEGMENTS = 12
const DRIFT_UP = 2.4
const SCROLL_SCALE_LOSS = 0.45

type Vec3 = [number, number, number]

export function Core() {
  const narrow = useNarrow()
  const group = useStationVisibility(STATION, VISIBLE_RANGE)
  const spin = useRef<Group>(null)
  const shell = useRef<Mesh>(null)
  const rings = useRef<(Group | null)[]>([])
  const aspect = useThree((s) => s.size.width / s.size.height)
  // Keep the core in the right-hand third of the frame whatever the window shape.
  const halfWidth = Math.tan(MathUtils.degToRad(layout.camera.fov) * HALF) * layout.camera.distance * aspect
  const base: Vec3 = narrow
    ? (core.mobilePosition as Vec3)
    : [halfWidth * core.screenX, core.position[1], core.position[2]]
  const fit = narrow ? 1 : clamp(aspect / core.fullSizeAspect, core.minScale, 1)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: BASE_AMP },
      uFreq: { value: NOISE_FREQ },
      uOpacity: { value: 1 },
      uColorA: { value: new Color('#05103a') },
      uColorB: { value: new Color('#00f2fe') },
      uRim: { value: new Color('#8b5cf6') },
    }),
    [],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const leaving = sceneState.station - STATION
    uniforms.uTime.value = t
    uniforms.uAmp.value = BASE_AMP + Math.max(leaving, 0) * SCROLL_AMP + sceneState.warp * WARP_AMP
    if (group.current) {
      group.current.position.set(base[0], base[1] + Math.max(leaving, 0) * DRIFT_UP, base[2])
      group.current.scale.setScalar(fit * (1 - (1 - peak(sceneState.station, STATION, 1)) * SCROLL_SCALE_LOSS))
    }
    if (spin.current) {
      spin.current.rotation.y += delta * (IDLE_SPIN + Math.abs(leaving) * SCROLL_SPIN)
      spin.current.rotation.x = sceneState.pointerY * POINTER_TILT
      spin.current.rotation.z = -sceneState.pointerX * POINTER_TILT
    }
    if (shell.current) shell.current.rotation.set(t * IDLE_SPIN, -t * IDLE_SPIN, 0)
    core.ringSpeeds.forEach((speed, i) => {
      const ring = rings.current[i]
      if (ring) ring.rotation.z = t * speed
    })
  })

  return (
    <group ref={group}>
      <group ref={spin}>
        <mesh>
          <icosahedronGeometry args={[core.radius, narrow ? core.mobileDetail : core.detail]} />
          <shaderMaterial vertexShader={coreVertex} fragmentShader={coreFragment} uniforms={uniforms} />
        </mesh>
        <mesh ref={shell}>
          <icosahedronGeometry args={[core.shell, SHELL_DETAIL]} />
          <meshBasicMaterial
            color="#4facfe"
            wireframe
            transparent
            opacity={SHELL_OPACITY}
            blending={AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>
      {core.rings.map((radius, i) => (
        <group key={radius} rotation={[HALF_PI + core.ringTilts[i][0], core.ringTilts[i][1], 0]}>
          <group ref={(el) => void (rings.current[i] = el)}>
            <mesh>
              <torusGeometry args={[radius, core.ringTube, RING_RADIAL, RING_SEGMENTS]} />
              <meshBasicMaterial
                color={i ? '#8b5cf6' : '#00f2fe'}
                transparent
                opacity={RING_OPACITY}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh position-x={radius}>
              <sphereGeometry args={[SATELLITE_SIZE, SATELLITE_SEGMENTS, SATELLITE_SEGMENTS]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

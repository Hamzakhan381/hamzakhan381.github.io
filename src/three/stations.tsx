import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Float, Instance, Instances, Lightformer } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
} from 'three'
import layout from './layout.json'
import { gridFragment, gridVertex } from './shaders'
import { sceneState, useNarrow, useStationVisibility } from './rig'
import { DOUBLE, HALF, HALF_PI, TAU, lerp } from '../lib/math'

type Vec3 = [number, number, number]
const v3 = (a: number[]) => a as Vec3

const VISIBLE_RANGE = 1.7
const ENV_RESOLUTION = 256

export function Lights() {
  const { lights } = layout
  return (
    <>
      <ambientLight intensity={lights.ambient} />
      {lights.points.map((p) => (
        <pointLight key={p.color + p.position[2]} color={p.color} intensity={p.intensity} position={v3(p.position)} />
      ))}
      <Environment resolution={ENV_RESOLUTION} frames={1}>
        {lights.formers.map((f) => (
          <Lightformer
            key={f.color + f.position.join()}
            form="rect"
            color={f.color}
            intensity={f.intensity}
            position={v3(f.position)}
            rotation={v3(f.rotation)}
            scale={v3(f.scale)}
          />
        ))}
      </Environment>
    </>
  )
}

/* ---------- About: chrome torus knot with orbiting cubes ---------- */

const KNOT_STATION = 1
const KNOT_TUBULAR = 240
const KNOT_RADIAL = 32
const KNOT_SCROLL_TURN = Math.PI
const KNOT_IDLE = 0.15
const CUBE_SIZE = 0.16
const CUBE_MIN_RADIUS = 2.6
const CUBE_SPIN = 0.08
const CUBE_COLORS = ['#00f2fe', '#8b5cf6', '#4facfe', '#e2e8f0']

export function Knot() {
  const narrow = useNarrow()
  const group = useStationVisibility(KNOT_STATION, VISIBLE_RANGE)
  const knot = useRef<Mesh>(null)
  const cubes = useRef<Group>(null)
  const { knot: cfg } = layout

  const cubeData = useMemo(
    () =>
      Array.from({ length: cfg.cubes }, (_, i) => {
        const angle = Math.random() * TAU
        const radius = CUBE_MIN_RADIUS + Math.random() * cfg.cubeSpread
        const y = (Math.random() - HALF) * cfg.cubeSpread
        return {
          position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as Vec3,
          rotation: [Math.random() * TAU, Math.random() * TAU, 0] as Vec3,
          scale: CUBE_SIZE + Math.random() * CUBE_SIZE,
          color: CUBE_COLORS[i % CUBE_COLORS.length],
        }
      }),
    [cfg.cubes, cfg.cubeSpread],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const local = sceneState.station - KNOT_STATION
    if (knot.current) {
      knot.current.rotation.set(local * KNOT_SCROLL_TURN + t * KNOT_IDLE, t * KNOT_IDLE + local, 0)
    }
    if (cubes.current) cubes.current.rotation.y = t * CUBE_SPIN + local * HALF_PI
  })

  return (
    <group ref={group} position={v3(narrow ? cfg.mobilePosition : cfg.position)}>
      <mesh ref={knot}>
        <torusKnotGeometry args={[cfg.radius, cfg.tube, KNOT_TUBULAR, KNOT_RADIAL]} />
        <meshStandardMaterial color="#cfe9ff" metalness={1} roughness={0.12} />
      </mesh>
      <group ref={cubes}>
        <Instances limit={cfg.cubes}>
          <boxGeometry />
          <meshStandardMaterial metalness={0.6} roughness={0.25} />
          {cubeData.map((c) => (
            <Instance key={c.position.join()} position={c.position} rotation={c.rotation} scale={c.scale} color={c.color} />
          ))}
        </Instances>
      </group>
    </group>
  )
}

/* ---------- Services: carousel of six glassy primitives ---------- */

const SHAPES_STATION = 2
const SHAPE_SCROLL_TURN = Math.PI
const SHAPE_IDLE = 0.1
const FLOAT_SPEED = 1.6
const FLOAT_INTENSITY = 1.4
const SHAPE_DETAIL = 0
const TORUS_TUBE = 0.28
const TORUS_RADIAL = 24
const TORUS_TUBULAR = 64
const CONE_SEGMENTS = 5
const CONE_HEIGHT = 1.4

function ShapeGeometry({ index }: { index: number }) {
  const geometries = [
    <icosahedronGeometry key="ico" args={[1, SHAPE_DETAIL]} />,
    <torusGeometry key="torus" args={[1 - TORUS_TUBE, TORUS_TUBE, TORUS_RADIAL, TORUS_TUBULAR]} />,
    <octahedronGeometry key="octa" args={[1, SHAPE_DETAIL]} />,
    <coneGeometry key="cone" args={[1, CONE_HEIGHT, CONE_SEGMENTS]} />,
    <dodecahedronGeometry key="dodeca" args={[1, SHAPE_DETAIL]} />,
    <boxGeometry key="box" />,
  ]
  return geometries[index % geometries.length]
}

export function Shapes() {
  const narrow = useNarrow()
  const group = useStationVisibility(SHAPES_STATION, VISIBLE_RANGE)
  const carousel = useRef<Group>(null)
  const { shapes: cfg } = layout
  const radius = narrow ? cfg.mobileRadius : cfg.radius

  useFrame((state) => {
    if (!carousel.current) return
    const local = sceneState.station - SHAPES_STATION
    carousel.current.rotation.z = local * SHAPE_SCROLL_TURN + state.clock.elapsedTime * SHAPE_IDLE
    carousel.current.rotation.x = sceneState.pointerY * SHAPE_IDLE
    carousel.current.rotation.y = -sceneState.pointerX * SHAPE_IDLE
  })

  return (
    <group ref={group} position={v3(narrow ? cfg.mobilePosition : cfg.position)}>
      <group ref={carousel}>
        {cfg.colors.map((color, i) => {
          const angle = (i / cfg.colors.length) * TAU
          return (
            <Float key={color} speed={FLOAT_SPEED} floatIntensity={FLOAT_INTENSITY} rotationIntensity={DOUBLE}>
              <mesh position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]} scale={cfg.size}>
                <ShapeGeometry index={i} />
                <meshPhysicalMaterial
                  color={color}
                  metalness={0.25}
                  roughness={0.12}
                  clearcoat={1}
                  iridescence={1}
                  iridescenceIOR={1.6}
                  flatShading
                />
              </mesh>
            </Float>
          )
        })}
      </group>
    </group>
  )
}

/* ---------- Projects: hexagonal ring tunnel the camera flies through ---------- */

const TUNNEL_STATION = 3
const HEX_SIDES = 6
const RING_RADIAL = 6
const RING_SPIN = 0.18
const RING_TWIST = 0.26
const RING_PULSE = 0.05
const PULSE_SPEED = 2.2

export function Tunnel() {
  const narrow = useNarrow()
  const group = useStationVisibility(TUNNEL_STATION, VISIBLE_RANGE)
  const mesh = useRef<InstancedMesh>(null)
  const { tunnel: cfg } = layout
  const count = narrow ? cfg.mobileCount : cfg.count
  const dummy = useMemo(() => new Object3D(), [])
  const depths = useMemo(
    () => Array.from({ length: count }, (_, i) => cfg.front - (i / (count - 1)) * (cfg.front + cfg.back)),
    [count, cfg.front, cfg.back],
  )

  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const a = new Color(cfg.colors[0])
    const b = new Color(cfg.colors[1])
    depths.forEach((_, i) => target.setColorAt(i, a.clone().lerp(b, i / (count - 1))))
    if (target.instanceColor) target.instanceColor.needsUpdate = true
  }, [depths, count, cfg.colors])

  useFrame((state) => {
    const target = mesh.current
    if (!target) return
    const t = state.clock.elapsedTime
    const local = sceneState.station - TUNNEL_STATION
    depths.forEach((z, i) => {
      const direction = i % DOUBLE ? 1 : -1
      dummy.position.set(0, 0, z)
      dummy.rotation.set(0, 0, i * RING_TWIST + direction * (t * RING_SPIN + local * HALF_PI))
      dummy.scale.setScalar(1 + Math.sin(t * PULSE_SPEED + i) * RING_PULSE)
      dummy.updateMatrix()
      target.setMatrixAt(i, dummy.matrix)
    })
    target.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} position-z={cfg.z}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <torusGeometry args={[cfg.radius, cfg.tube, RING_RADIAL, HEX_SIDES]} />
        <meshBasicMaterial transparent opacity={0.42} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/* ---------- Contact: point-cloud globe above a breathing wave grid ---------- */

const CONTACT_STATION = 4
const GOLDEN_ANGLE = 2.399963229728653
const GLOBE_POINT_SIZE = 0.065
const GLOBE_SPIN = 0.12
const ORBIT_TUBE = 0.01
const ORBIT_SCALE = 1.35
const ORBIT_SEGMENTS = 128
const ORBIT_TILT = 0.4
const GRID_CELLS = 70
const GRID_FADE_NEAR = 6
const GRID_FADE_FAR = 48

function globeGeometry(count: number, radius: number) {
  const coords = Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * DOUBLE
    const ring = Math.sqrt(1 - y * y)
    const theta = GOLDEN_ANGLE * i
    return [Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius]
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(coords.flat()), coords[0].length))
  return geometry
}

export function ContactScene() {
  const narrow = useNarrow()
  const group = useStationVisibility(CONTACT_STATION, VISIBLE_RANGE)
  const globe = useRef<Group>(null)
  const { contact: cfg } = layout
  const points = narrow ? cfg.mobileGlobePoints : cfg.globePoints
  const geometry = useMemo(() => globeGeometry(points, cfg.globeRadius), [points, cfg.globeRadius])
  const gridUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCells: { value: GRID_CELLS },
      uFogNear: { value: GRID_FADE_NEAR },
      uFogFar: { value: GRID_FADE_FAR },
      uOpacity: { value: 1 },
      uColorA: { value: new Color('#4facfe') },
      uColorB: { value: new Color('#8b5cf6') },
    }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    gridUniforms.uTime.value = t
    gridUniforms.uOpacity.value = lerp(0, 1, Math.max(0, 1 - Math.abs(sceneState.station - CONTACT_STATION)))
    if (globe.current) {
      globe.current.rotation.y = t * GLOBE_SPIN + (sceneState.station - CONTACT_STATION) * HALF_PI
      globe.current.rotation.x = sceneState.pointerY * GLOBE_SPIN
    }
  })

  return (
    <group ref={group}>
      <group ref={globe} position={v3(narrow ? cfg.mobileGlobePosition : cfg.globePosition)}>
        <points geometry={geometry}>
          <pointsMaterial
            color="#00f2fe"
            size={GLOBE_POINT_SIZE}
            sizeAttenuation
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
        <mesh rotation={[HALF_PI + ORBIT_TILT, ORBIT_TILT, 0]}>
          <torusGeometry args={[cfg.globeRadius * ORBIT_SCALE, ORBIT_TUBE, RING_RADIAL, ORBIT_SEGMENTS]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      </group>
      <mesh rotation-x={-HALF_PI} position={[0, cfg.gridY, cfg.gridZ]}>
        <planeGeometry
          args={[
            cfg.gridSize,
            cfg.gridSize,
            narrow ? cfg.mobileGridSegments : cfg.gridSegments,
            narrow ? cfg.mobileGridSegments : cfg.gridSegments,
          ]}
        />
        <shaderMaterial
          vertexShader={gridVertex}
          fragmentShader={gridFragment}
          uniforms={gridUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

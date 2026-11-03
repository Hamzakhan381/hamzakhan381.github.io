import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Group, MathUtils, Mesh, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector3 } from 'three'
import config from '../scene.json'
import { useHalfWidth, useNarrow, usePalette } from '../kit'
import { scrollState } from '../../lib/scroll'
import { useTheme } from '../../lib/theme'
import { DOUBLE, HALF, HALF_PI } from '../../lib/math'

const C = config.globe
const GOLDEN_ANGLE = 2.399963229728653
const OCCLUDER_SCALE = 0.985
const SPHERE_SEGMENTS = 48
const MARKER_SEGMENTS = 12
const RING_TUBE = 0.006
const RING_SEGMENTS = 48
const PULSE_SPEED = 1.2
const ARC_SIDES = 6
const INDICES_PER_QUAD = 6
const POINTER_TILT = 0.12
const POINT_OPACITY = 0.55
const FORWARD = new Vector3(0, 0, 1)

function latLon(lat: number, lon: number, radius: number) {
  const phi = HALF_PI - MathUtils.degToRad(lat)
  const theta = MathUtils.degToRad(lon)
  return new Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    -radius * Math.sin(phi) * Math.sin(theta),
  )
}

/** Contact: a dotted globe with connection arcs pulsing out from home to cities around the world. */
export function Globe() {
  const narrow = useNarrow()
  const half = useHalfWidth(C.z)
  const palette = usePalette()
  const theme = useTheme()
  const outer = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const pulse = useRef<Mesh>(null)
  const count = narrow ? C.mobilePoints : C.points

  const home = useMemo(() => latLon(C.home[0], C.home[1], C.radius), [])
  const facing = useMemo(() => Math.atan2(-home.x, home.z), [home])
  const markerTurn = useMemo(() => new Quaternion().setFromUnitVectors(FORWARD, home.clone().normalize()), [home])

  const points = useMemo(() => {
    const coords = Array.from({ length: count }, (_, i) => {
      const y = 1 - (i / (count - 1)) * DOUBLE
      const ring = Math.sqrt(1 - y * y)
      const theta = GOLDEN_ANGLE * i
      return [Math.cos(theta) * ring * C.radius, y * C.radius, Math.sin(theta) * ring * C.radius]
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(coords.flat(), coords[0].length))
    return g
  }, [count])
  useEffect(() => () => points.dispose(), [points])

  const arcs = useMemo(
    () =>
      C.cities.map(([lat, lon], i) => {
        const end = latLon(lat, lon, C.radius)
        const mid = home.clone().add(end).multiplyScalar(HALF)
        mid.setLength(C.radius * (1 + C.arcLift * (home.distanceTo(end) / (C.radius * DOUBLE))))
        const curve = new QuadraticBezierCurve3(home, mid, end)
        return {
          geometry: new TubeGeometry(curve, C.arcSegments, C.arcRadius, ARC_SIDES, false),
          end,
          offset: i / C.cities.length,
        }
      }),
    [home],
  )
  useEffect(() => () => arcs.forEach((a) => a.geometry.dispose()), [arcs])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const quad = ARC_SIDES * INDICES_PER_QUAD
    arcs.forEach((arc) => {
      const total = arc.geometry.index?.count ?? 0
      // Each arc draws out from home, then its tail follows it to the city: phase 0→1 grows, 1→2 retracts.
      const phase = ((t * C.arcSpeed + arc.offset) % 1) * DOUBLE
      const start = phase < 1 ? 0 : (phase - 1) * total
      const end = phase < 1 ? phase * total : total
      arc.geometry.setDrawRange(Math.floor(start / quad) * quad, Math.floor((end - start) / quad) * quad)
    })
    if (pulse.current) pulse.current.scale.setScalar(1 + ((t * PULSE_SPEED) % 1) * (C.pulseScale - 1))
    if (spin.current) {
      spin.current.rotation.y =
        facing + Math.sin(t * C.spin) * HALF + scrollState.progress * C.turn + scrollState.pointerX * POINTER_TILT
    }
    if (outer.current) {
      outer.current.position.set(narrow ? 0 : half * C.x, (narrow ? C.mobileY : C.y) + scrollState.progress * DOUBLE, C.z)
      outer.current.rotation.x = C.tilt + scrollState.pointerY * POINTER_TILT
      outer.current.scale.setScalar(narrow ? C.mobileScale : 1)
    }
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        <mesh scale={OCCLUDER_SCALE}>
          <sphereGeometry args={[C.radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
          <meshBasicMaterial color={config.background[theme]} />
        </mesh>
        <points geometry={points}>
          <pointsMaterial color={palette.line} size={C.pointSize} sizeAttenuation transparent opacity={POINT_OPACITY} depthWrite={false} />
        </points>
        {arcs.map((arc) => (
          <group key={arc.end.toArray().join()}>
            <mesh geometry={arc.geometry}>
              <meshBasicMaterial color={palette.accent} toneMapped={false} />
            </mesh>
            <mesh position={arc.end}>
              <sphereGeometry args={[C.markerSize * HALF, MARKER_SEGMENTS, MARKER_SEGMENTS]} />
              <meshBasicMaterial color={palette.line} />
            </mesh>
          </group>
        ))}
        <group position={home} quaternion={markerTurn}>
          <mesh>
            <sphereGeometry args={[C.markerSize, MARKER_SEGMENTS, MARKER_SEGMENTS]} />
            <meshBasicMaterial color={palette.accent} toneMapped={false} />
          </mesh>
          <mesh ref={pulse}>
            <torusGeometry args={[C.markerSize * DOUBLE, RING_TUBE, MARKER_SEGMENTS, RING_SEGMENTS]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={HALF} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

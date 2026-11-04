import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Edges } from '@react-three/drei'
import { Group, InstancedMesh, MathUtils, Mesh, Object3D } from 'three'
import config from '../scene.json'
import { Label, fromEmptySpace, readTrack, setPointer3D, useHalfWidth, useNarrow, usePalette } from '../kit'
import { home } from '../../content'
import { scrollState, scrollToCentre } from '../../lib/scroll'
import { HALF, lerp } from '../../lib/math'

const S = config.stack
const layers = home.layers.items
const SLAB_DAMPING = 6
const POINTER_TILT = 0.12
const SLAB_OPACITY = 0.94
const CONNECTOR_RADIUS = 0.008
const CONNECTOR_SIDES = 6
const PACKET_SEGMENTS = 10
/** How far open (0 closed, 1 fully exploded) the stack must be before every slab shows its label. */
const LABELS_FROM = 0.35

type Vec3 = [number, number, number]

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (SMOOTH_A - SMOOTH_B * t)
}
const SMOOTH_A = 3
const SMOOTH_B = 2

/** Home: the layers of a web system stacked as slabs that explode apart on scroll while requests flow through them. */
export function ArchitectureStack() {
  const narrow = useNarrow()
  const half = useHalfWidth(S.z)
  const palette = usePalette()
  const outer = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const slabs = useRef<(Group | null)[]>([])
  const connectors = useRef<(Mesh | null)[]>([])
  const labels = useRef<(Group | null)[]>([])
  const packets = useRef<InstancedMesh>(null)
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  const dummy = useMemo(() => new Object3D(), [])
  const hovered = useRef(-1)

  // Hover a slab to lift it; click to jump to the card that explains that layer.
  const hoverAt = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const next = fromEmptySpace(e) ? i : -1
    if (next === hovered.current) return
    hovered.current = next
    setPointer3D(next >= 0)
  }
  const leave = () => {
    hovered.current = -1
    setPointer3D(false)
  }
  const open = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    if (!fromEmptySpace(e)) return
    e.stopPropagation()
    scrollToCentre(`layer-${i}`)
  }
  useEffect(() => () => setPointer3D(false), [])

  const chips = useMemo(() => {
    const [w, h, d] = S.chipSize
    const lift = (S.thickness + h) * HALF
    return Array.from({ length: S.chipCols * S.chipRows }, (_, i): Vec3 => {
      const col = i % S.chipCols
      const row = Math.floor(i / S.chipCols)
      return [
        (col - (S.chipCols - 1) * HALF) * (w + S.chipGap),
        lift,
        (row - (S.chipRows - 1) * HALF) * (d + S.chipGap),
      ]
    })
  }, [])

  const packetData = useMemo(
    () =>
      Array.from({ length: S.packets }, (_, i) => ({
        lane: S.lanes[i % S.lanes.length],
        phase: Math.random(),
        speed: S.packetSpeed * (HALF + Math.random()),
      })),
    [],
  )

  useFrame((state, delta) => {
    const track = readTrack('stack', S.z)
    const gap = lerp(S.gapClosed, S.gapOpen, smoothstep(0, S.explodeUntil, track.progress))
    const focus = hovered.current >= 0 ? hovered.current : scrollState.focus
    if (focus !== activeRef.current) {
      activeRef.current = focus
      setActive(focus)
    }
    const top = (layers.length - 1) * HALF * gap
    const span = (layers.length - 1) * gap
    // While the stack is closed, every slab but the top one hides most of its label: show those once it opens.
    const opened = (gap - S.gapClosed) / (S.gapOpen - S.gapClosed) > LABELS_FROM
    labels.current.forEach((_, i) => {
      const label = labels.current[i]
      if (label) label.visible = i === 0 || opened
    })

    if (outer.current) {
      outer.current.position.set(narrow ? 0 : half * S.x, (narrow ? S.mobileY : S.y) + track.y, S.z)
      outer.current.scale.setScalar(narrow ? S.mobileScale : S.scale)
    }
    if (spin.current) {
      spin.current.rotation.set(
        S.tilt[0] + scrollState.pointerY * POINTER_TILT,
        S.tilt[1] + track.progress * S.turn + scrollState.pointerX * POINTER_TILT,
        S.tilt[2],
      )
    }
    slabs.current.forEach((_, i) => {
      const slab = slabs.current[i]
      if (!slab) return
      const target = top - i * gap + (i === focus ? S.activeLift : 0)
      slab.position.y = MathUtils.damp(slab.position.y, target, SLAB_DAMPING, delta)
    })
    connectors.current.forEach((_, i) => {
      const connector = connectors.current[i]
      if (connector) connector.scale.y = Math.max(span, CONNECTOR_RADIUS)
    })

    const mesh = packets.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    packetData.forEach((packet, i) => {
      const travelled = (t * packet.speed + packet.phase) % 1
      dummy.position.set(packet.lane[0], top - travelled * span, packet.lane[1])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        {layers.map((layer, i) => {
          const on = i === active
          return (
            <group key={layer.name} ref={(el) => void (slabs.current[i] = el)}>
              <mesh onPointerMove={hoverAt(i)} onPointerOut={leave} onClick={open(i)}>
                <boxGeometry args={[S.width, S.thickness, S.depth]} />
                <meshStandardMaterial color={palette.surface} transparent opacity={SLAB_OPACITY} roughness={0.55} metalness={0.1} />
                <Edges color={on ? palette.accent : palette.line} />
              </mesh>
              {chips.map((position) => (
                <mesh key={position.join()} position={position}>
                  <boxGeometry args={S.chipSize as Vec3} />
                  <meshStandardMaterial color={on ? palette.accent : palette.surface} roughness={0.4} />
                  <Edges color={on ? palette.accent : palette.dim} />
                </mesh>
              ))}
              <Billboard ref={(el) => void (labels.current[i] = el)} position={[-S.width * HALF, S.labelLift, S.depth * HALF]}>
                {/* On a solid tag: when the stack opens up, long layer names would otherwise cross the chips behind them. */}
                <Label
                  text={`0${i + 1}  ${layer.name.toUpperCase()}`}
                  height={S.labelHeight}
                  color={on ? palette.accent : palette.line}
                  align="left"
                  plate={palette.surface}
                  plateEdge={on ? palette.accent : palette.dim}
                />
              </Billboard>
            </group>
          )
        })}
        {S.lanes.map((lane, i) => (
          <mesh key={lane.join()} ref={(el) => void (connectors.current[i] = el)} position={[lane[0], 0, lane[1]]}>
            <cylinderGeometry args={[CONNECTOR_RADIUS, CONNECTOR_RADIUS, 1, CONNECTOR_SIDES]} />
            <meshBasicMaterial color={palette.dim} />
          </mesh>
        ))}
        <instancedMesh ref={packets} args={[undefined, undefined, S.packets]} frustumCulled={false}>
          <sphereGeometry args={[S.packetSize, PACKET_SEGMENTS, PACKET_SEGMENTS]} />
          <meshBasicMaterial color={palette.accent} toneMapped={false} />
        </instancedMesh>
      </group>
    </group>
  )
}

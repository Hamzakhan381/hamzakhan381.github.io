import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Edges, RoundedBox } from '@react-three/drei'
import { CatmullRomCurve3, Group, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, Object3D, TubeGeometry, Vector3 } from 'three'
import config from '../scene.json'
import { Label, fromEmptySpace, labelTexture, readTrack, setPointer3D, useFontsVersion, useHalfWidth, useNarrow, usePalette } from '../kit'
import { experience } from '../../content'
import { scrollState, scrollToCentre } from '../../lib/scroll'
import { HALF, clamp } from '../../lib/math'

const C = config.career
const HEX_SIDES = 6
const POINTER_TILT = 0.1
const DAMPING = 6
const ROLE_WEIGHT = 600
const TUBE_SEGMENTS = 64
const TUBE_SIDES = 6
const PLATE_RADIUS = 0.06
const PLATE_SMOOTHNESS = 4
const DIM_OPACITY = 0.45
const FACE_OFFSET = 0.004
/** Periods read "Mar 2025 – Oct 2025"; the platform shows when each role started. */
const PERIOD_SEPARATOR = ' – '

/** Oldest role first, so the chart reads left to right as growth; `job` is the role's index in experience.json. */
const roles = experience.map((job, i) => ({ job, index: i })).reverse()
const count = roles.length
const spanX = (count - 1) * C.spacing
const particleIds = Array.from({ length: C.particles }, (_, i) => i)

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (SMOOTH_A - SMOOTH_B * t)
}
const SMOOTH_A = 3
const SMOOTH_B = 2

/**
 * About: the career as a 3D growth chart. One glowing pillar per role, each taller than the one before, rising as
 * you scroll through the experience; a trend line traces their tops, and the role you're reading lifts, lights up
 * and streams data from its top. Hover a pillar to highlight it, click it to jump to that role's entry.
 */
export function GrowthChart() {
  const narrow = useNarrow()
  const half = useHalfWidth(C.z)
  const palette = usePalette()
  const outer = useRef<Group>(null)
  const pillars = useRef<(Group | null)[]>([])
  const caps = useRef<(MeshBasicMaterial | null)[]>([])
  const tags = useRef<(Group | null)[]>([])
  const trend = useRef<Mesh>(null)
  const particles = useRef<InstancedMesh>(null)
  const grown = useRef(roles.map(() => 0))
  /** Clock time when the chart first came into play (-1 until then); the pillars rise in turn from there. */
  const appearAt = useRef(-1)
  const lift = useRef(roles.map(() => 0))
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  const hovered = useRef(-1)
  const dummy = useMemo(() => new Object3D(), [])

  const xOf = (k: number) => k * C.spacing - spanX * HALF
  const heightOf = (k: number) => C.baseHeight + k * C.step

  // Hover a pillar to highlight it; click to jump to that role's entry in the git log.
  const hoverAt = (k: number) => (e: ThreeEvent<PointerEvent>) => {
    const next = fromEmptySpace(e) ? k : -1
    if (next === hovered.current) return
    hovered.current = next
    setPointer3D(next >= 0)
  }
  const leave = () => {
    hovered.current = -1
    setPointer3D(false)
  }
  const open = (k: number) => (e: ThreeEvent<MouseEvent>) => {
    if (!fromEmptySpace(e)) return
    e.stopPropagation()
    scrollToCentre(`job-${roles[k].index}`)
  }
  useEffect(() => () => setPointer3D(false), [])

  // The trend line runs through the tops of the fully grown pillars.
  const trendGeometry = useMemo(() => {
    const points = roles.map((_, k) => new Vector3(xOf(k), heightOf(k) + C.capHeight, 0))
    return new TubeGeometry(new CatmullRomCurve3(points), TUBE_SEGMENTS, C.trendRadius, TUBE_SIDES, false)
  }, [])
  useEffect(() => () => trendGeometry.dispose(), [trendGeometry])

  // Each tag (role over company) shrinks as a block to fit between its neighbours, so tags never overlap.
  useFontsVersion()
  const labelRoom = C.spacing * C.labelFit
  const tagScale = roles.map(({ job }) =>
    Math.min(
      1,
      labelRoom /
        Math.max(C.labelHeight * labelTexture(job.role, ROLE_WEIGHT, false).aspect, C.subLabelHeight * labelTexture(`@ ${job.org}`).aspect),
    ),
  )

  // Fit the chart into the right-hand part of the screen, beside the page's cards.
  const chartHalfWidth = spanX * HALF + C.radius + C.labelPad
  const scale = narrow ? C.mobileScale : Math.min(1, (half * C.fit) / chartHalfWidth)

  useFrame((state, delta) => {
    const track = readTrack('experience', C.z)
    const p = track.progress
    const focus = hovered.current >= 0 ? hovered.current : roles.findIndex((r) => r.index === scrollState.focus)
    if (focus !== activeRef.current) {
      activeRef.current = focus
      setActive(focus)
    }
    const t = state.clock.elapsedTime
    // The chart rises as soon as you reach the experience, oldest role first, so every pillar is up by the time
    // you read about it (the page lists the newest role first).
    if (appearAt.current < 0 && (focus >= 0 || p > 0)) appearAt.current = t
    const elapsed = appearAt.current < 0 ? -1 : t - appearAt.current

    roles.forEach((_, k) => {
      const target = elapsed >= k * C.riseStagger ? 1 : C.minGrow
      grown.current[k] = MathUtils.damp(grown.current[k], target, C.riseDamping, delta)
      lift.current[k] = MathUtils.damp(lift.current[k], k === focus ? C.activeLift : 0, DAMPING, delta)
      const pillar = pillars.current[k]
      if (pillar) {
        pillar.scale.y = grown.current[k]
        pillar.position.y = lift.current[k]
      }
      const tag = tags.current[k]
      if (tag) tag.position.y = heightOf(k) * grown.current[k] + lift.current[k] + C.labelLift
      const cap = caps.current[k]
      if (cap) cap.color.copy(k === focus ? palette.accent : palette.dim).multiplyScalar(k === focus ? 1 + Math.sin(t * C.pulse) * C.pulseDepth : 1)
    })

    // The trend line draws itself across the tops once the last pillar is up.
    const line = trend.current
    if (line) {
      const indexCount = trendGeometry.index?.count ?? 0
      const drawStart = count * C.riseStagger
      line.geometry.setDrawRange(0, Math.floor(indexCount * smoothstep(drawStart, drawStart + C.trendFor, elapsed)))
    }

    // Data streams up out of the active pillar's top.
    const swarm = particles.current
    if (swarm) {
      swarm.visible = focus >= 0
      if (focus >= 0) {
        const top = heightOf(focus) * grown.current[focus] + lift.current[focus] + C.capHeight
        particleIds.forEach((i) => {
          const life = (t * C.particleSpeed + i / C.particles) % 1
          const angle = i * C.particleSpread
          dummy.position.set(
            xOf(focus) + Math.cos(angle) * C.radius * HALF * (1 - life),
            top + life * C.particleRise,
            Math.sin(angle) * C.radius * HALF * (1 - life),
          )
          dummy.rotation.set(t + i, t * HALF + i, 0)
          dummy.scale.setScalar(Math.max(Number.EPSILON, (1 - life) * C.particleSize))
          dummy.updateMatrix()
          swarm.setMatrixAt(i, dummy.matrix)
        })
        swarm.instanceMatrix.needsUpdate = true
      }
    }

    if (outer.current) {
      outer.current.position.set(narrow ? 0 : half * C.x, (narrow ? C.mobileY : C.y) + track.y, C.z)
      outer.current.scale.setScalar(scale)
      outer.current.rotation.set(
        C.tilt[0] + scrollState.pointerY * POINTER_TILT,
        C.tilt[1] + p * C.turn + scrollState.pointerX * POINTER_TILT,
        C.tilt[2],
      )
    }
  })

  return (
    <group ref={outer}>
      <RoundedBox
        args={[spanX + C.spacing, C.plateHeight, C.plateDepth]}
        radius={PLATE_RADIUS}
        smoothness={PLATE_SMOOTHNESS}
        position={[0, -C.plateHeight * HALF, 0]}
      >
        <meshStandardMaterial color={palette.surface} roughness={0.6} />
        <Edges color={palette.line} />
      </RoundedBox>
      <gridHelper
        args={[1, C.gridDivisions, palette.dim, palette.dim]}
        scale={[spanX + C.spacing, 1, C.plateDepth]}
        position={[0, FACE_OFFSET, 0]}
      />

      {roles.map(({ job }, k) => {
        const on = k === active
        const h = heightOf(k)
        return (
          <group key={job.org}>
            <group ref={(el) => void (pillars.current[k] = el)} position={[xOf(k), 0, 0]} scale={[1, C.minGrow, 1]}>
              <mesh position={[0, h * HALF, 0]} onPointerMove={hoverAt(k)} onPointerOut={leave} onClick={open(k)}>
                <cylinderGeometry args={[C.radius, C.radius, h, HEX_SIDES]} />
                <meshStandardMaterial color={palette.surface} roughness={0.4} metalness={0.1} />
                <Edges color={on ? palette.accent : palette.line} />
              </mesh>
              <mesh position={[0, h + C.capHeight * HALF, 0]}>
                <cylinderGeometry args={[C.radius * C.capInset, C.radius * C.capInset, C.capHeight, HEX_SIDES]} />
                <meshBasicMaterial ref={(el) => void (caps.current[k] = el)} color={palette.dim} toneMapped={false} />
              </mesh>
            </group>
            <Label
              text={job.period.split(PERIOD_SEPARATOR)[0]}
              height={C.dateHeight}
              color={on ? palette.accent : palette.line}
              opacity={C.subOpacity}
              position={[xOf(k), -C.plateHeight * HALF, C.plateDepth * HALF + FACE_OFFSET]}
            />
            {/* On phones the chart sits behind the cards as decoration: tags there would only cover the page's text. */}
            <Billboard ref={(el) => void (tags.current[k] = el)} position={[xOf(k), h, 0]} visible={!narrow}>
              <Label
                text={job.role}
                height={C.labelHeight * tagScale[k]}
                color={on ? palette.accent : palette.line}
                weight={ROLE_WEIGHT}
                mono={false}
                plate={palette.surface}
                plateEdge={on ? palette.accent : palette.dim}
                opacity={on || active < 0 ? 1 : DIM_OPACITY}
              />
              <Label
                text={`@ ${job.org}`}
                height={C.subLabelHeight * tagScale[k]}
                color={palette.line}
                position={[0, -(C.labelHeight + C.subLabelHeight) * HALF * tagScale[k] * C.lineStep, 0]}
                opacity={(on || active < 0 ? 1 : DIM_OPACITY) * C.subOpacity}
              />
            </Billboard>
          </group>
        )
      })}

      <mesh ref={trend} geometry={trendGeometry}>
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>

      <instancedMesh ref={particles} args={[undefined, undefined, C.particles]} frustumCulled={false} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

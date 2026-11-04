import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { CatmullRomCurve3, Group, LineCurve3, MathUtils, Mesh, TubeGeometry, Vector3 } from 'three'
import config from '../scene.json'
import { Label, fromEmptySpace, labelTexture, readTrack, setPointer3D, useFontsVersion, useHalfWidth, useNarrow, usePalette } from '../kit'
import { experience } from '../../content'
import { scrollState, scrollToCentre } from '../../lib/scroll'
import { DOUBLE, HALF, clamp } from '../../lib/math'

const G = config.git
const NODE_SEGMENTS = 16
const NODE_DAMPING = 8
const HEAD_SCALE = 1.6
const BRANCH_EASE_IN = 0.6
const BRANCH_DROP = 0.08
const BRANCH_SPREAD = 0.15
const POINTER_TILT = 0.1
const DIM_OPACITY = 0.35
/** World units kept clear between a label's end and the screen edge (the section rail's dots live there). */
const EDGE_MARGIN = 0.65
/** Line spacing between the company and the dates, as a multiple of their text height. */
const LINE_STEP = 1.35
const PERIOD_OPACITY = 0.7
const ROLE_WEIGHT = 600

type Branch = { geometry: TubeGeometry; start: number; end: number; tip: Vector3; label: Vector3 }

/** About: the career drawn as a git history. The main line and each role's branch draw themselves as you scroll. */
export function GitGraph() {
  const narrow = useNarrow()
  const half = useHalfWidth(G.z)
  const palette = usePalette()
  const outer = useRef<Group>(null)
  const main = useRef<Mesh>(null)
  const branchMeshes = useRef<(Mesh | null)[]>([])
  const nodes = useRef<(Mesh | null)[]>([])
  const head = useRef<Mesh>(null)
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  const hovered = useRef(-1)

  // Hover a branch label to highlight that role; click to jump to its git-log entry.
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
    scrollToCentre(`job-${i}`)
  }
  useEffect(() => () => setPointer3D(false), [])

  const { mainGeometry, branches, nodeSpots } = useMemo(() => {
    const top = G.height * HALF
    const seg = G.height / experience.length
    const mainCurve = new LineCurve3(new Vector3(0, top, 0), new Vector3(0, -top, 0))
    const made: Branch[] = experience.map((_, i) => {
      const side = i % DOUBLE ? -1 : 1
      const ys = top - (i + G.branchStart) * seg
      const ye = top - (i + G.branchEnd) * seg
      const mid = (ys + ye) * HALF
      const z = side * G.branchZ
      const curve = new CatmullRomCurve3([
        new Vector3(0, ys, 0),
        new Vector3(G.branchX * BRANCH_EASE_IN, ys - seg * BRANCH_DROP, z * HALF),
        new Vector3(G.branchX, mid + seg * BRANCH_SPREAD, z),
        new Vector3(G.branchX, mid - seg * BRANCH_SPREAD, z),
        new Vector3(G.branchX * BRANCH_EASE_IN, ye + seg * BRANCH_DROP, z * HALF),
        new Vector3(0, ye, 0),
      ])
      return {
        geometry: new TubeGeometry(curve, G.segments, G.branchRadius, G.radial, false),
        start: (i + G.branchStart) / experience.length,
        end: (i + G.branchEnd) / experience.length,
        tip: new Vector3(G.branchX, mid, z),
        label: new Vector3(G.branchX + G.labelGap, mid, z),
      }
    })
    const spots = [
      { at: 0, pos: new Vector3(0, top, 0) },
      ...made.flatMap((b) => [
        { at: b.start, pos: new Vector3(0, top - b.start * G.height, 0) },
        { at: (b.start + b.end) * HALF, pos: b.tip },
        { at: b.end, pos: new Vector3(0, top - b.end * G.height, 0) },
      ]),
    ]
    return {
      mainGeometry: new TubeGeometry(mainCurve, G.segments, G.mainRadius, G.radial, false),
      branches: made,
      nodeSpots: spots,
    }
  }, [])

  // Room for the labels between the branch tips and the right edge of the screen, in the graph's own units. Each
  // label block (role, company, dates) shrinks as a whole to fit, so it never runs off the page and the role stays
  // the largest line.
  useFontsVersion()
  const scale = narrow ? G.mobileScale : 1
  const graphX = narrow ? 0 : half * G.x
  const labelRoom = (half - EDGE_MARGIN - graphX) / scale - (G.branchX + G.labelGap) * Math.cos(G.tilt[1])
  const labelLines = experience.map((job) => ({ role: job.role, org: `@ ${job.org}`, period: job.period }))
  const blockScale = labelLines.map((lines) => {
    const widest = Math.max(
      G.labelHeight * labelTexture(lines.role, ROLE_WEIGHT, false).aspect,
      G.subLabelHeight * labelTexture(lines.org).aspect,
      G.subLabelHeight * labelTexture(lines.period).aspect,
    )
    return Math.min(1, labelRoom / widest)
  })

  useEffect(
    () => () => {
      mainGeometry.dispose()
      branches.forEach((b) => b.geometry.dispose())
    },
    [mainGeometry, branches],
  )

  useFrame((_, delta) => {
    const track = readTrack('experience', G.z)
    const p = track.progress
    const focus = hovered.current >= 0 ? hovered.current : scrollState.focus
    if (focus !== activeRef.current) {
      activeRef.current = focus
      setActive(focus)
    }
    const drawn = (geometry: TubeGeometry, fraction: number) => {
      const count = geometry.index?.count ?? 0
      geometry.setDrawRange(0, Math.floor(count * clamp(fraction, 0, 1)))
    }
    drawn(mainGeometry, p)
    branches.forEach((b) => drawn(b.geometry, (p - b.start) / (b.end - b.start)))

    nodes.current.forEach((_, i) => {
      const node = nodes.current[i]
      if (!node) return
      const target = p >= nodeSpots[i].at ? 1 : 0
      node.scale.setScalar(MathUtils.damp(node.scale.x, target, NODE_DAMPING, delta) || Number.EPSILON)
    })
    if (head.current) head.current.position.y = G.height * HALF - p * G.height

    if (outer.current) {
      outer.current.position.set(graphX, track.y + (p * G.height - G.height * HALF) * scale, G.z)
      outer.current.scale.setScalar(scale)
      outer.current.rotation.set(G.tilt[0] + scrollState.pointerY * POINTER_TILT, G.tilt[1] + scrollState.pointerX * POINTER_TILT, G.tilt[2])
    }
  })

  return (
    <group ref={outer}>
      <mesh ref={main} geometry={mainGeometry}>
        <meshBasicMaterial color={palette.line} toneMapped={false} />
      </mesh>
      {branches.map((b, i) => (
        <group key={experience[i].org}>
          <mesh ref={(el) => void (branchMeshes.current[i] = el)} geometry={b.geometry}>
            <meshBasicMaterial color={i === active ? palette.accent : palette.line} toneMapped={false} />
          </mesh>
          <Billboard position={b.label.toArray()} onPointerMove={hoverAt(i)} onPointerOut={leave} onClick={open(i)}>
            <Label
              text={labelLines[i].role}
              height={G.labelHeight * blockScale[i]}
              color={i === active ? palette.accent : palette.line}
              weight={ROLE_WEIGHT}
              mono={false}
              align="left"
              opacity={i === active || active < 0 ? 1 : DIM_OPACITY}
            />
            <Label
              text={labelLines[i].org}
              height={G.subLabelHeight * blockScale[i]}
              color={palette.line}
              align="left"
              position={[0, -G.labelHeight * blockScale[i], 0]}
              opacity={i === active || active < 0 ? 1 : DIM_OPACITY}
            />
            <Label
              text={labelLines[i].period}
              height={G.subLabelHeight * blockScale[i]}
              color={palette.line}
              align="left"
              position={[0, -(G.labelHeight + G.subLabelHeight * LINE_STEP) * blockScale[i], 0]}
              opacity={(i === active || active < 0 ? 1 : DIM_OPACITY) * PERIOD_OPACITY}
            />
          </Billboard>
        </group>
      ))}
      {nodeSpots.map((spot, i) => (
        <mesh key={`${spot.at}-${i}`} ref={(el) => void (nodes.current[i] = el)} position={spot.pos} scale={Number.EPSILON}>
          <sphereGeometry args={[G.nodeSize, NODE_SEGMENTS, NODE_SEGMENTS]} />
          <meshStandardMaterial color={palette.surface} emissive={palette.accent} emissiveIntensity={0.6} />
        </mesh>
      ))}
      <mesh ref={head} scale={HEAD_SCALE}>
        <sphereGeometry args={[G.nodeSize, NODE_SEGMENTS, NODE_SEGMENTS]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>
    </group>
  )
}

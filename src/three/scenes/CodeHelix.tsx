import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { CatmullRomCurve3, Group, InstancedMesh, MathUtils, Mesh, Object3D, TubeGeometry, Vector3 } from 'three'
import config from '../scene.json'
import { Label, fromEmptySpace, labelTexture, readTrack, setPointer3D, useFontsVersion, useHalfWidth, useNarrow, usePalette } from '../kit'
import { experience } from '../../content'
import { scrollState, scrollToCentre } from '../../lib/scroll'
import { DOUBLE, HALF, HALF_PI } from '../../lib/math'

const H = config.helix
const POINTER_TILT = 0.1
const ROLE_WEIGHT = 600
const TUBE_SEGMENTS = 240
const TUBE_SIDES = 8
const RING_SEGMENTS = 64
const SAMPLES_PER_RUNG = 6
const OPENERS = ['{', '<', '(', '[', '/*', '=>', '#', '$']
const CLOSERS = ['}', '/>', ')', ']', '*/', ';', '&&', '!']

/** Oldest role at the bottom, so the helix grows upward through the career; `index` is the role's place in experience.json. */
const roles = experience.map((job, index) => ({ job, index })).reverse()
const count = Math.max(roles.length, 1)
const perBand = Math.floor(H.rungs / count)
const rungIds = Array.from({ length: perBand * count }, (_, i) => i)
const bandOf = (i: number) => Math.floor(i / perBand)
const yOf = (i: number) => -H.height * HALF + (i + HALF) * (H.height / rungIds.length)
const angleOf = (i: number) => i * H.twist
const bandY = (k: number) => (yOf(k * perBand) + yOf((k + 1) * perBand - 1)) * HALF
const strandPoint = (i: number, side: number, radius = H.radius) => {
  const a = angleOf(i) + (side > 0 ? 0 : Math.PI)
  return new Vector3(Math.cos(a) * radius, yOf(i), Math.sin(a) * radius)
}

/** One strand as a smooth tube through its side of every rung, sampled finely so it curls rather than kinks. */
function strandGeometry(side: number) {
  const samples = Array.from({ length: (rungIds.length - 1) * SAMPLES_PER_RUNG + 1 }, (_, s) => s / SAMPLES_PER_RUNG)
  const points = samples.map((i) => {
    const a = i * H.twist + (side > 0 ? 0 : Math.PI)
    return new Vector3(Math.cos(a) * H.radius, -H.height * HALF + (i + HALF) * (H.height / rungIds.length), Math.sin(a) * H.radius)
  })
  return new TubeGeometry(new CatmullRomCurve3(points), TUBE_SEGMENTS, H.strandRadius, TUBE_SIDES, false)
}

/**
 * About: the career as code DNA. A double helix of two strands joined by rungs, with a code symbol riding each end
 * of every rung. Each role is a band of rungs, oldest at the bottom; the helix zips itself together when you reach
 * the experience, and the band for the role you're reading glows while a scanner ring slides to it and a tag names
 * the role. Hover a band to highlight it, click it to jump to that role's entry.
 */
export function CodeHelix() {
  const narrow = useNarrow()
  const half = useHalfWidth(H.z)
  const palette = usePalette()
  const outer = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const rungs = useRef<InstancedMesh>(null)
  const nodes = useRef<InstancedMesh>(null)
  const ring = useRef<Mesh>(null)
  const tag = useRef<Group>(null)
  const glyphs = useRef<(Group | null)[]>([])
  const grown = useRef(rungIds.map(() => 0))
  const appearAt = useRef(-1)
  const ringY = useRef(0)
  const ringOn = useRef(0)
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  const hovered = useRef(-1)
  const dummy = useMemo(() => new Object3D(), [])

  const hoverAt = (e: ThreeEvent<PointerEvent>) => {
    const next = fromEmptySpace(e) && e.instanceId !== undefined ? bandOf(e.instanceId) : -1
    if (next === hovered.current) return
    hovered.current = next
    setPointer3D(next >= 0)
  }
  const leave = () => {
    hovered.current = -1
    setPointer3D(false)
  }
  const open = (e: ThreeEvent<MouseEvent>) => {
    if (!fromEmptySpace(e) || e.instanceId === undefined) return
    e.stopPropagation()
    scrollToCentre(`job-${roles[bandOf(e.instanceId)].index}`)
  }
  useEffect(() => () => setPointer3D(false), [])

  const strands = useMemo(() => [strandGeometry(1), strandGeometry(-1)], [])
  useEffect(() => () => strands.forEach((g) => g.dispose()), [strands])

  // Rungs and nodes start dim, and get their per-instance colour before the scene's first compile.
  const paint = (focus: number) => {
    const rungMesh = rungs.current
    const nodeMesh = nodes.current
    if (!rungMesh || !nodeMesh) return
    rungIds.forEach((i) => {
      const lit = bandOf(i) === focus
      rungMesh.setColorAt(i, lit ? palette.accent : palette.dim)
      nodeMesh.setColorAt(i * DOUBLE, lit ? palette.accent : palette.line)
      nodeMesh.setColorAt(i * DOUBLE + 1, lit ? palette.accent : palette.line)
    })
    if (rungMesh.instanceColor) rungMesh.instanceColor.needsUpdate = true
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true
  }
  useLayoutEffect(() => paint(-1), [])
  useEffect(() => paint(active), [active])

  // The tag beside the active band, shrunk as a block to fit the room between the helix and the screen edge.
  useFontsVersion()
  const shown = active >= 0 ? roles[active].job : undefined
  const desktopX = half * H.x
  const room = Math.max(half - desktopX - H.radius - H.tagPad - H.tagMargin, H.minTagRoom)
  const tagScale = shown
    ? Math.min(
        1,
        room /
          Math.max(
            H.labelHeight * labelTexture(shown.role, ROLE_WEIGHT, false).aspect,
            H.subLabelHeight * labelTexture(`@ ${shown.org}`).aspect,
            H.subLabelHeight * labelTexture(shown.period).aspect,
          ),
      )
    : 1
  const roleH = H.labelHeight * tagScale
  const subH = H.subLabelHeight * tagScale
  const gap = H.tagGap * tagScale
  const orgY = -(roleH * HALF + gap + subH * HALF)
  const periodY = orgY - subH - gap * HALF
  const tagCentre = (roleH * HALF + periodY - subH * HALF) * HALF

  useFrame((state, delta) => {
    const track = readTrack('experience', H.z)
    const focus = hovered.current >= 0 ? hovered.current : roles.findIndex((r) => r.index === scrollState.focus)
    if (focus !== activeRef.current) {
      activeRef.current = focus
      setActive(focus)
    }
    const t = state.clock.elapsedTime
    if (appearAt.current < 0 && track.present && track.y > -H.height) appearAt.current = t
    const elapsed = appearAt.current < 0 ? -1 : t - appearAt.current

    // Rungs zip together from the bottom up; the active band swells slightly and breathes.
    const rungMesh = rungs.current
    const nodeMesh = nodes.current
    if (rungMesh && nodeMesh) {
      rungIds.forEach((i) => {
        grown.current[i] = MathUtils.damp(grown.current[i], elapsed >= i * H.stagger ? 1 : 0, H.growDamping, delta)
        const lit = bandOf(i) === focus
        const reach = H.radius * (1 + (lit ? H.bulge * (1 + Math.sin(t * H.pulse + i)) * HALF : 0))
        const g = grown.current[i]
        const a = angleOf(i)
        dummy.position.set(0, yOf(i), 0)
        dummy.rotation.set(0, -a, HALF_PI)
        dummy.scale.set(1, Math.max(reach * DOUBLE * g, Number.EPSILON), 1)
        dummy.updateMatrix()
        rungMesh.setMatrixAt(i, dummy.matrix)
        ;[1, -1].forEach((side, s) => {
          dummy.position.copy(strandPoint(i, side, reach))
          dummy.rotation.set(0, 0, 0)
          dummy.scale.setScalar(H.nodeSize * Math.max(g, Number.EPSILON) * (lit ? H.litNode : 1))
          dummy.updateMatrix()
          nodeMesh.setMatrixAt(i * DOUBLE + s, dummy.matrix)
        })
        const glyphA = glyphs.current[i * DOUBLE]
        const glyphB = glyphs.current[i * DOUBLE + 1]
        if (glyphA) glyphA.position.copy(strandPoint(i, 1, reach + H.glyphOffset))
        if (glyphB) glyphB.position.copy(strandPoint(i, -1, reach + H.glyphOffset))
        if (glyphA) glyphA.scale.setScalar(Math.max(g, Number.EPSILON))
        if (glyphB) glyphB.scale.setScalar(Math.max(g, Number.EPSILON))
      })
      rungMesh.instanceMatrix.needsUpdate = true
      nodeMesh.instanceMatrix.needsUpdate = true
    }

    // The scanner ring slides to the active band.
    ringOn.current = MathUtils.damp(ringOn.current, focus >= 0 ? 1 : 0, H.growDamping, delta)
    if (focus >= 0) ringY.current = MathUtils.damp(ringY.current, bandY(focus), H.growDamping, delta)
    if (ring.current) {
      ring.current.position.y = ringY.current
      ring.current.scale.setScalar(Math.max(ringOn.current, Number.EPSILON))
      ring.current.visible = ringOn.current > H.minVisible
    }
    if (tag.current) {
      tag.current.position.set(H.radius + H.tagPad, ringY.current - tagCentre, 0)
      tag.current.visible = ringOn.current > HALF
    }

    if (spin.current) spin.current.rotation.y = t * H.spin + track.progress * H.turn
    if (outer.current) {
      outer.current.position.set(narrow ? 0 : desktopX, (narrow ? H.mobileY : H.y) + track.y, H.z)
      outer.current.scale.setScalar(narrow ? H.mobileScale : 1)
      outer.current.rotation.set(H.tilt[0] + scrollState.pointerY * POINTER_TILT, scrollState.pointerX * POINTER_TILT, H.tilt[2])
    }
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        {strands.map((geometry, s) => (
          <mesh key={s} geometry={geometry}>
            <meshStandardMaterial color={palette.line} emissive={palette.accent} emissiveIntensity={0.12} metalness={0.3} roughness={0.35} />
          </mesh>
        ))}
        <instancedMesh ref={rungs} args={[undefined, undefined, rungIds.length]} onPointerMove={hoverAt} onPointerOut={leave} onClick={open}>
          <cylinderGeometry args={[H.rungRadius, H.rungRadius, 1, TUBE_SIDES]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
        <instancedMesh ref={nodes} args={[undefined, undefined, rungIds.length * DOUBLE]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
        {rungIds.flatMap((i) =>
          [OPENERS[i % OPENERS.length], CLOSERS[i % CLOSERS.length]].map((glyph, s) => {
            const lit = bandOf(i) === active
            return (
              <Billboard key={`${i}-${s}`} ref={(el) => void (glyphs.current[i * DOUBLE + s] = el)} scale={0}>
                <Label text={glyph} height={H.glyphHeight} color={lit ? palette.accent : palette.dim} opacity={lit ? 1 : H.glyphOpacity} />
              </Billboard>
            )
          }),
        )}
      </group>

      <mesh ref={ring} rotation={[HALF_PI, 0, 0]} visible={false}>
        <torusGeometry args={[H.radius + H.ringGap, H.ringTube, TUBE_SIDES, RING_SEGMENTS]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>

      {/* One tag beside the band you're reading. On phones the helix sits behind the cards, so it gets no tag. */}
      {shown && !narrow ? (
        <group ref={tag} visible={false}>
          <Label text={shown.role} height={roleH} color={palette.accent} weight={ROLE_WEIGHT} mono={false} align="left" plate={palette.surface} plateEdge={palette.accent} />
          <Label text={`@ ${shown.org}`} height={subH} color={palette.line} align="left" position={[0, orgY, 0]} />
          <Label text={shown.period} height={subH} color={palette.line} opacity={H.subOpacity} align="left" position={[0, periodY, 0]} />
        </group>
      ) : null}
    </group>
  )
}

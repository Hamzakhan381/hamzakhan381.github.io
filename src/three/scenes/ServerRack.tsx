import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Group, MathUtils, MeshBasicMaterial } from 'three'
import config from '../scene.json'
import { Label, fitLabelHeight, fromEmptySpace, readTrack, setPointer3D, useFontsVersion, useHalfWidth, useNarrow, usePalette } from '../kit'
import { services } from '../../content'
import { scrollState, scrollToCentre } from '../../lib/scroll'
import { HALF } from '../../lib/math'

const R = config.rack
const units = services.items
const POINTER_TILT = 0.1
const BLINK_SPEED = 3.2
const BLINK_SPEED_ACTIVE = 9
const LED_SPACING = 0.17
const LED_INSET = 0.3
const VENT_WIDTH = 0.035
const VENT_SPACING = 0.11
const VENT_HEIGHT_RATIO = 0.55
const VENT_INSET = 0.35
/** Clear space between the label and the status LEDs on its left / the vents on its right. */
const LABEL_GAP = 0.12
const FACE_OFFSET = 0.006
const UNIT_INSET = 0.12
const INDEX_DIGITS = 2

/** Services: a server rack with one unit per service. The unit for the service on screen slides out with its LEDs racing. */
export function ServerRack() {
  const narrow = useNarrow()
  const half = useHalfWidth(R.z)
  const palette = usePalette()
  const outer = useRef<Group>(null)
  const unitRefs = useRef<(Group | null)[]>([])
  const leds = useRef<(MeshBasicMaterial | null)[]>([])
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  const hovered = useRef(-1)

  // Hover a unit to slide it out; click to jump to that service's card.
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
  const open = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    if (!fromEmptySpace(e)) return
    e.stopPropagation()
    scrollToCentre(`service-${id}`)
  }
  useEffect(() => () => setPointer3D(false), [])

  const pitch = R.unitHeight + R.unitGap
  const height = units.length * pitch + R.unitGap
  const unitWidth = R.width - R.post - UNIT_INSET
  const unitDepth = R.depth - UNIT_INSET
  const face = unitDepth * HALF + FACE_OFFSET
  const unitY = (i: number) => height * HALF - R.unitGap - R.unitHeight * HALF - i * pitch

  // Each label sits between the status LEDs and the vents, all at one text size: the largest at which the longest
  // service name still fits, so names added in services.json never run into the vents.
  useFontsVersion()
  const ledsEnd = -unitWidth * HALF + LED_INSET * HALF + (R.leds - 1) * LED_SPACING + R.ledSize * HALF
  const ventsStart = unitWidth * HALF - VENT_INSET - (R.vents - 1) * VENT_SPACING - VENT_WIDTH * HALF
  const labelStart = ledsEnd + LABEL_GAP
  const labelTexts = units.map((service, i) => `${String(i + 1).padStart(INDEX_DIGITS, '0')}  ${service.short}`)
  const labelHeight = fitLabelHeight(labelTexts, ventsStart - LABEL_GAP - labelStart, R.labelHeight)

  const posts = useMemo(
    () =>
      [-1, 1].flatMap((sx) => [-1, 1].map((sz): [number, number, number] => [sx * R.width * HALF, 0, sz * R.depth * HALF])),
    [],
  )

  useFrame((state, delta) => {
    const track = readTrack('services', R.z)
    const focus = hovered.current >= 0 ? hovered.current : scrollState.focus
    if (focus !== activeRef.current) {
      activeRef.current = focus
      setActive(focus)
    }
    const t = state.clock.elapsedTime
    unitRefs.current.forEach((_, i) => {
      const unit = unitRefs.current[i]
      if (unit) unit.position.z = MathUtils.damp(unit.position.z, i === focus ? R.slide : 0, R.slideDamping, delta)
    })
    leds.current.forEach((_, k) => {
      const material = leds.current[k]
      if (!material) return
      const unit = Math.floor(k / R.leds)
      const speed = unit === focus ? BLINK_SPEED_ACTIVE : BLINK_SPEED
      const on = Math.sin(t * speed + k * k) > 0
      const lit = k % R.leds === 0 ? palette.ok : palette.accent
      material.color.copy(on ? lit : palette.dim)
    })
    if (outer.current) {
      outer.current.position.set(narrow ? 0 : half * R.x, (narrow ? R.mobileY : 0) + track.y, R.z)
      outer.current.scale.setScalar(narrow ? R.mobileScale : 1)
      outer.current.rotation.set(
        R.tilt[0] + scrollState.pointerY * POINTER_TILT,
        R.tilt[1] + track.progress * R.turn + scrollState.pointerX * POINTER_TILT,
        R.tilt[2],
      )
    }
  })

  return (
    <group ref={outer}>
      {posts.map((p) => (
        <mesh key={p.join()} position={p}>
          <boxGeometry args={[R.post, height + R.post, R.post]} />
          <meshStandardMaterial color={palette.surface} />
          <Edges color={palette.line} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, side * (height + R.post) * HALF, 0]}>
          <boxGeometry args={[R.width + R.post, R.post, R.depth + R.post]} />
          <meshStandardMaterial color={palette.surface} />
          <Edges color={palette.line} />
        </mesh>
      ))}
      {units.map((service, i) => {
        const on = i === active
        return (
          <group key={service.id} ref={(el) => void (unitRefs.current[i] = el)} position={[0, unitY(i), 0]}>
            <mesh onPointerMove={hoverAt(i)} onPointerOut={leave} onClick={open(service.id)}>
              <boxGeometry args={[unitWidth, R.unitHeight, unitDepth]} />
              <meshStandardMaterial color={palette.surface} roughness={0.5} />
              <Edges color={on ? palette.accent : palette.line} />
            </mesh>
            {Array.from({ length: R.leds }, (_, k) => (
              <mesh key={k} position={[-unitWidth * HALF + LED_INSET * HALF + k * LED_SPACING, 0, face]}>
                <boxGeometry args={[R.ledSize, R.ledSize, R.ledSize]} />
                <meshBasicMaterial ref={(el) => void (leds.current[i * R.leds + k] = el)} color={palette.dim} toneMapped={false} />
              </mesh>
            ))}
            <Label
              text={labelTexts[i]}
              height={labelHeight}
              color={on ? palette.accent : palette.line}
              align="left"
              position={[labelStart, 0, face]}
            />
            {Array.from({ length: R.vents }, (_, k) => (
              <mesh key={`v${k}`} position={[unitWidth * HALF - VENT_INSET - k * VENT_SPACING, 0, face]}>
                <boxGeometry args={[VENT_WIDTH, R.unitHeight * VENT_HEIGHT_RATIO, FACE_OFFSET]} />
                <meshBasicMaterial color={on ? palette.accent : palette.dim} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

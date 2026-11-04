import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Edges, RoundedBox } from '@react-three/drei'
import {
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Vector3,
} from 'three'
import D from './developer.json'
import { Ink, LookContext, Toon, useToonGradient } from '../toon'
import { Label, fromEmptySpace, labelTexture, readTrack, setPointer3D, useFontsVersion, useHalfWidth, useNarrow, usePalette } from '../kit'
import { contact } from '../../content'
import { deskMood, now } from '../../lib/deskMood'
import { scrollState } from '../../lib/scroll'
import { DOUBLE, HALF, HALF_PI, TAU } from '../../lib/math'

type Vec3 = [number, number, number]
const v3 = (a: number[]) => a as Vec3
const C = D.colors
const UP = new Vector3(0, 1, 0)
const SMOOTH = 32
const LOW = 12
const CAPSULE_CAPS = 8
const STEAM_SEGMENTS = 10
const MIRROR = [-1, 1]
const BUBBLE_WEIGHT = 600

type Mode = 'idle' | 'hello' | 'typing' | 'poke' | 'sent'

/* ---------- Static set pieces ---------- */

function Desk({ surface }: { surface: Color }) {
  return (
    <group>
      <mesh position={[0, D.desk.topY, 0]}>
        <boxGeometry args={v3(D.desk.top)} />
        <Toon color={surface} />
        <Ink />
      </mesh>
      <mesh position={[0, D.desk.panelY, D.desk.panelZ]}>
        <boxGeometry args={v3(D.desk.panel)} />
        <Toon color={surface} />
        <Ink />
      </mesh>
    </group>
  )
}

function Chair({ accent }: { accent: Color }) {
  const ch = D.chair
  return (
    <group position={[0, ch.y, ch.z]}>
      <RoundedBox args={v3(ch.back)} radius={ch.radius} smoothness={4}>
        <Toon color={C.chair} />
        <Ink />
      </RoundedBox>
      {MIRROR.map((side) => (
        <mesh key={side} position={[side * ch.stripeX, 0, ch.back[2] * HALF]}>
          <boxGeometry args={v3(ch.stripe)} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Laptop({ accent, sticker, glow }: { accent: Color; sticker: Color; glow: React.RefObject<PointLight | null> }) {
  const L = D.laptop
  return (
    <group position={[0, 0, L.z]}>
      <mesh position={[0, L.baseY, 0]}>
        <boxGeometry args={v3(L.base)} />
        <Toon color={C.laptop} />
        <Ink />
      </mesh>
      {/* Hinge on the edge nearest the camera; the lid leans toward the viewer so we see its back. */}
      <group position={[0, L.baseY * DOUBLE, L.base[2] * HALF]} rotation-x={L.open}>
        <mesh position={[0, L.lid[1] * HALF, 0]}>
          <boxGeometry args={v3(L.lid)} />
          <Toon color={C.laptop} />
          <Ink />
        </mesh>
        <group position={[0, L.stickerY, L.lid[2] * HALF + D.faceOffset]}>
          <mesh>
            <circleGeometry args={[L.sticker, SMOOTH]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
          <Label text="</>" height={L.sticker} color={sticker} weight={700} position={[0, 0, D.faceOffset]} />
        </group>
        <mesh position={[0, L.lid[1] * HALF, -L.lid[2] * HALF - D.faceOffset]} rotation-y={Math.PI}>
          <planeGeometry args={[L.lid[0] * (1 - D.holo.margin), L.lid[1] * (1 - D.holo.margin)]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={glow} position={v3(L.glowPosition)} color={accent} intensity={L.glow} distance={L.glowDistance} />
    </group>
  )
}

/* ---------- Props ---------- */

function Mug() {
  const M = D.mug
  const steam = useRef<(Mesh | null)[]>([])
  const materials = useRef<(MeshBasicMaterial | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    steam.current.forEach((_, i) => {
      const puff = steam.current[i]
      const material = materials.current[i]
      if (!puff || !material) return
      const phase = (t * M.speed + i / M.steam) % 1
      puff.position.set(Math.sin(phase * TAU + i) * M.steamSize, M.height + phase * M.rise, 0)
      puff.scale.setScalar(1 + phase * DOUBLE)
      material.opacity = (1 - phase) * M.steamOpacity
    })
  })
  return (
    <group position={v3(M.position)}>
      <mesh position={[0, M.height * HALF, 0]}>
        <cylinderGeometry args={[M.radius, M.radius * M.taper, M.height, SMOOTH]} />
        <Toon color={C.mug} />
        <Ink />
      </mesh>
      <mesh position={[M.radius + M.handle * HALF, M.height * HALF, 0]}>
        <torusGeometry args={[M.handle, M.handleTube, LOW, LOW * DOUBLE]} />
        <Toon color={C.mug} />
        <Ink />
      </mesh>
      {Array.from({ length: M.steam }, (_, i) => (
        <mesh key={i} ref={(el) => void (steam.current[i] = el)}>
          <sphereGeometry args={[M.steamSize, STEAM_SEGMENTS, STEAM_SEGMENTS]} />
          <meshBasicMaterial ref={(el) => void (materials.current[i] = el)} color="#ffffff" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** A rubber duck, for rubber-duck debugging. Click it and it hops, spins and offers advice. */
function Duck({ fill, ink }: { fill: Color; ink: Color }) {
  const K = D.duck
  const duck = useRef<Group>(null)
  const [talking, setTalking] = useState(false)
  useFrame((state) => {
    const since = now() - deskMood.duckAt
    const hop = since < K.hopFor ? since / K.hopFor : 1
    if (duck.current) {
      duck.current.rotation.y = Math.sin(state.clock.elapsedTime * K.bobSpeed) * K.bob - HALF_PI * HALF + hop * K.spin
      duck.current.position.y = K.position[1] + Math.sin(hop * Math.PI) * K.hop
    }
    const speaking = since < D.pokeFor
    if (speaking !== talking) setTalking(speaking)
  })
  const quack = (e: ThreeEvent<MouseEvent>) => {
    if (!fromEmptySpace(e)) return
    e.stopPropagation()
    deskMood.duckAt = now()
  }
  return (
    <group
      ref={duck}
      position={v3(K.position)}
      onClick={quack}
      onPointerMove={(e) => setPointer3D(fromEmptySpace(e))}
      onPointerOut={() => setPointer3D(false)}
    >
      {talking ? (
        <Billboard position={v3(K.bubble)}>
          <SpeechBubble text={contact.desk.duck} fill={fill} ink={ink} />
        </Billboard>
      ) : null}
      <mesh position={[0, K.body * K.bodyScale[1], 0]} scale={v3(K.bodyScale)}>
        <sphereGeometry args={[K.body, SMOOTH, SMOOTH]} />
        <Toon color={C.duck} />
        <Ink />
      </mesh>
      <mesh position={v3(K.headOffset)}>
        <sphereGeometry args={[K.head, SMOOTH, SMOOTH]} />
        <Toon color={C.duck} />
        <Ink />
      </mesh>
      <mesh position={v3(K.beakOffset)} rotation-z={-HALF_PI}>
        <coneGeometry args={[K.beak[0], K.beak[1], LOW]} />
        <Toon color={C.beak} />
      </mesh>
      {MIRROR.map((side) => (
        <mesh key={side} position={[K.eyeOffset[0], K.eyeOffset[1], side * K.eyeOffset[2]]}>
          <sphereGeometry args={[K.eye, LOW, LOW]} />
          <meshBasicMaterial color={C.eye} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Holographic panels ---------- */

function Holo({ spec, accent, children }: { spec: typeof D.holo.code; accent: Color; children?: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame((state) => {
    if (group.current) group.current.position.y = spec.position[1] + Math.sin(state.clock.elapsedTime * D.holo.floatSpeed + spec.position[0]) * D.holo.float
  })
  return (
    <group ref={group} position={v3(spec.position)} rotation={v3(spec.rotation)}>
      <mesh>
        <planeGeometry args={[spec.size[0], spec.size[1]]} />
        <meshBasicMaterial color={accent} transparent opacity={D.holo.opacity} side={DoubleSide} depthWrite={false} toneMapped={false} />
        <Edges color={accent} />
      </mesh>
      {children}
    </group>
  )
}

function CodeLines({ accent, line, fast }: { accent: Color; line: Color; fast: boolean }) {
  const H = D.holo
  const [w, h] = H.code.size
  const usable = w - H.margin * DOUBLE
  const lines = useMemo(
    () =>
      Array.from({ length: H.lines }, (_, i) => {
        const indent = (i % H.indentLevels) * H.margin
        const width = (usable - indent) * (HALF + HALF * Math.abs(Math.sin(i * H.indentLevels)))
        return { x: -w * HALF + H.margin + indent + width * HALF, width, accent: i % H.accentEvery === 1 }
      }),
    [H.lines, H.margin, H.indentLevels, H.accentEvery, usable, w],
  )
  const meshes = useRef<(Mesh | null)[]>([])
  const offset = useRef(0)
  useFrame((_, delta) => {
    offset.current += delta * (fast ? H.speedFast : H.speed)
    const span = H.lines * H.lineGap
    meshes.current.forEach((_, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      const y = h * HALF - H.margin - ((i * H.lineGap + offset.current) % span)
      mesh.position.setY(y)
      mesh.visible = y > -h * HALF + H.margin
    })
  })
  return (
    <>
      {lines.map((l, i) => (
        <mesh key={i} ref={(el) => void (meshes.current[i] = el)} position={[l.x, 0, D.faceOffset]}>
          <planeGeometry args={[l.width, H.lineHeight]} />
          <meshBasicMaterial color={l.accent ? accent : line} transparent opacity={l.accent ? 1 : HALF} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

/* ---------- The developer ---------- */

const shoulder = (side: number) => new Vector3(side * D.arms.shoulder[0], D.arms.shoulder[1], D.arms.shoulder[2])

/** Stretches a unit capsule between two points. */
function placeLimb(limb: Mesh, from: Vector3, to: Vector3) {
  const direction = to.clone().sub(from)
  limb.position.copy(from).add(to).multiplyScalar(HALF)
  limb.quaternion.setFromUnitVectors(UP, direction.clone().normalize())
  limb.scale.set(1, direction.length(), 1)
}

export function Developer() {
  const narrow = useNarrow()
  const half = useHalfWidth(D.placement.z)
  const palette = usePalette()
  const camera = useThree((s) => s.camera)
  const gradient = useToonGradient(D.tones)
  const look = useMemo(() => ({ gradient, ink: palette.line, outline: D.outline }), [gradient, palette.line])
  const deskColor = useMemo(() => new Color(D.deskColor), [])

  const outer = useRef<Group>(null)
  const head = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const brows = useRef<Group>(null)
  const mouth = useRef<Mesh>(null)
  const arms = useRef<(Mesh | null)[]>([])
  const hands = useRef<(Mesh | null)[]>([])
  const glow = useRef<PointLight>(null)
  const bubble = useRef<Group>(null)
  const handPos = useMemo(() => MIRROR.map((side) => new Vector3(side * D.arms.hand[0], D.arms.hand[1], D.arms.hand[2])), [])
  const target = useMemo(() => new Vector3(), [])
  const headWorld = useMemo(() => new Vector3(), [])
  const [mode, setMode] = useState<Mode>('idle')
  const modeRef = useRef<Mode>('idle')
  const [statusIndex, setStatusIndex] = useState(0)
  const [quip, setQuip] = useState(0)

  // Click him: he waves and says the next quip.
  const poke = (e: ThreeEvent<MouseEvent>) => {
    if (!fromEmptySpace(e)) return
    e.stopPropagation()
    deskMood.pokedAt = now()
    setQuip((q) => q + 1)
  }
  useEffect(() => () => setPointer3D(false), [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const clock = now()
    const A = D.arms

    if (head.current) head.current.getWorldPosition(headWorld).project(camera)
    const hovering = Math.hypot(headWorld.x - scrollState.pointerX, headWorld.y - scrollState.pointerY) < D.hoverRadius
    const typing = clock - deskMood.typedAt < D.typingFor
    const moods: [boolean, Mode][] = [
      [clock - deskMood.sentAt < D.cheerFor, 'sent'],
      [clock - deskMood.pokedAt < D.pokeFor, 'poke'],
      [typing || deskMood.focused, 'typing'],
      [hovering, 'hello'],
    ]
    const next: Mode = moods.find(([on]) => on)?.[1] ?? 'idle'
    if (next !== modeRef.current) {
      modeRef.current = next
      setMode(next)
    }
    const status = Math.floor(t / D.statusEvery) % contact.desk.status.length
    if (status !== statusIndex) setStatusIndex(status)

    // Hands: type on the keyboard, wave when the cursor is near, both up to celebrate a sent message.
    const speed = typing ? A.typeSpeedFast : A.typeSpeed
    handPos.forEach((hand, i) => {
      const side = MIRROR[i]
      const tap = Math.max(Math.sin(t * speed + i * Math.PI), 0) * A.typeLift
      if (next === 'sent') target.set(side * A.cheer[0], A.cheer[1] + Math.sin(t * A.cheerSpeed + i) * A.cheerShake, A.cheer[2])
      else if ((next === 'hello' || next === 'poke') && side > 0) target.set(A.wave[0] + Math.sin(t * A.waveSpeed) * A.waveSwing, A.wave[1], A.wave[2])
      else target.set(side * A.hand[0], A.hand[1] + tap, A.hand[2])
      hand.set(
        MathUtils.damp(hand.x, target.x, A.damping, delta),
        MathUtils.damp(hand.y, target.y, A.damping, delta),
        MathUtils.damp(hand.z, target.z, A.damping, delta),
      )
      const arm = arms.current[i]
      const palm = hands.current[i]
      if (arm) placeLimb(arm, shoulder(side), hand)
      if (palm) palm.position.copy(hand)
    })

    // Head: follow the cursor, glance at the form while the visitor writes, nod along to the music.
    if (head.current) {
      const lookY = next === 'typing' ? D.head.formLook : scrollState.pointerX * D.head.lookX
      const lookX = next === 'typing' ? D.head.lookY * HALF : -scrollState.pointerY * D.head.lookY
      head.current.rotation.set(
        MathUtils.damp(head.current.rotation.x, lookX, D.head.damping, delta),
        MathUtils.damp(head.current.rotation.y, lookY, D.head.damping, delta),
        0,
      )
      head.current.position.setY(D.head.y + Math.abs(Math.sin(t * D.head.bobSpeed)) * D.head.bob)
    }
    if (eyes.current) eyes.current.scale.setY(t % D.eyes.blinkEvery < D.eyes.blinkFor ? D.eyes.closed : 1)
    if (brows.current) brows.current.position.setY(D.brows.y + (next === 'idle' || next === 'typing' ? 0 : D.brows.raise))
    if (mouth.current) mouth.current.scale.setScalar(next === 'sent' ? D.mouth.cheerScale : 1)
    if (glow.current) glow.current.intensity = (typing ? D.laptop.glowFast : D.laptop.glow) * (1 + Math.sin(t * speed) * HALF * HALF)
    if (bubble.current) bubble.current.scale.setScalar(MathUtils.damp(bubble.current.scale.x, next === 'idle' ? Number.EPSILON : 1, D.bubble.damping, delta))

    const track = readTrack('desk', D.placement.z)
    const P = D.placement
    if (outer.current) {
      outer.current.position.set(narrow ? 0 : half * P.x, (narrow ? P.mobileY : P.y) + track.y, P.z)
      outer.current.scale.setScalar(narrow ? P.mobileScale : P.scale)
      outer.current.rotation.set(P.tilt[0], P.tilt[1] + track.progress * P.turn + scrollState.pointerX * P.pointerTurn, P.tilt[2])
    }
  })

  const H = D.head
  const E = D.eyes
  const bubbleText = {
    idle: '',
    hello: contact.desk.hello,
    typing: contact.desk.typing,
    poke: contact.desk.quips[quip % contact.desk.quips.length],
    sent: contact.desk.sent,
  }[mode]
  const statusText = mode === 'sent' ? contact.desk.sentStatus : contact.desk.status[statusIndex]

  return (
    <LookContext.Provider value={look}>
      <group ref={outer}>
        <Desk surface={deskColor} />
        {/* Invisible box around the developer that catches hover and clicks. */}
        <mesh
          position={v3(D.hitBox.position)}
          onClick={poke}
          onPointerMove={(e) => setPointer3D(fromEmptySpace(e))}
          onPointerOut={() => setPointer3D(false)}
        >
          <boxGeometry args={v3(D.hitBox.size)} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <Chair accent={palette.accent} />

        {/* Torso in a hoodie, with drawstrings */}
        <group position={[0, D.body.y, D.body.z]} scale={v3(D.body.scale)}>
          <mesh>
            <capsuleGeometry args={[D.body.radius, D.body.length, CAPSULE_CAPS, SMOOTH]} />
            <Toon color={C.hoodie} />
            <Ink />
          </mesh>
        </group>
        {MIRROR.map((side) => (
          <group key={side} position={[side * D.body.stringX, D.body.stringTop - D.body.stringLength * HALF, D.body.stringZ]}>
            <mesh>
              <cylinderGeometry args={[D.body.stringRadius, D.body.stringRadius, D.body.stringLength, LOW]} />
              <meshBasicMaterial color={C.string} />
            </mesh>
            <mesh position={[0, -D.body.stringLength * HALF, 0]}>
              <sphereGeometry args={[D.body.tip, LOW, LOW]} />
              <meshBasicMaterial color={C.string} />
            </mesh>
          </group>
        ))}

        {/* Arms are unit capsules stretched from shoulder to hand every frame. */}
        {MIRROR.map((side, i) => (
          <group key={side}>
            <mesh ref={(el) => void (arms.current[i] = el)}>
              <capsuleGeometry args={[D.arms.radius, 1, CAPSULE_CAPS, SMOOTH]} />
              <Toon color={C.hoodie} />
              <Ink />
            </mesh>
            <mesh ref={(el) => void (hands.current[i] = el)}>
              <sphereGeometry args={[D.arms.handRadius, SMOOTH, SMOOTH]} />
              <Toon color={C.skin} />
              <Ink />
            </mesh>
          </group>
        ))}

        <group ref={head} position={[0, H.y, H.z]}>
          <mesh scale={v3(H.scale)}>
            <sphereGeometry args={[H.radius, SMOOTH * DOUBLE, SMOOTH]} />
            <Toon color={C.skin} />
            <Ink />
          </mesh>
          {/* Hood: a sphere shell open at the front */}
          <mesh position={v3(D.hood.offset)}>
            <sphereGeometry args={[D.hood.radius, SMOOTH * DOUBLE, SMOOTH, HALF_PI + D.hood.gap * HALF, TAU - D.hood.gap, 0, D.hood.theta]} />
            <Toon color={C.hood} side={DoubleSide} />
          </mesh>
          <mesh rotation-x={D.hair.tilt}>
            <sphereGeometry args={[D.hair.radius, SMOOTH * DOUBLE, SMOOTH, 0, TAU, 0, D.hair.theta]} />
            <Toon color={C.hair} />
          </mesh>

          <group ref={eyes} position={[0, E.y, 0]}>
            {MIRROR.map((side) => (
              <group key={side} position={[side * E.x, 0, E.z]}>
                <mesh scale={v3(E.scale)}>
                  <sphereGeometry args={[E.radius, LOW * DOUBLE, LOW]} />
                  <meshBasicMaterial color={C.eye} />
                </mesh>
                <mesh position={v3(E.shineOffset)}>
                  <sphereGeometry args={[E.shine, LOW, LOW]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={brows} position={[0, D.brows.y, E.z]}>
            {MIRROR.map((side) => (
              <mesh key={side} position={[side * E.x, 0, 0]} rotation-z={-side * D.brows.tilt}>
                <boxGeometry args={v3(D.brows.size)} />
                <meshBasicMaterial color={C.hair} />
              </mesh>
            ))}
          </group>

          {/* Glasses with lenses tinted by the screen glow */}
          <group position={[0, E.y, D.glasses.z]}>
            {MIRROR.map((side) => (
              <group key={side} position={[side * E.x, 0, 0]}>
                <mesh>
                  <torusGeometry args={[D.glasses.radius, D.glasses.tube, LOW, SMOOTH]} />
                  <meshBasicMaterial color={C.glasses} />
                </mesh>
                <mesh>
                  <circleGeometry args={[D.glasses.radius, SMOOTH]} />
                  <meshBasicMaterial color={palette.accent} transparent opacity={D.glasses.lensOpacity} depthWrite={false} toneMapped={false} />
                </mesh>
              </group>
            ))}
            <mesh rotation-z={HALF_PI}>
              <cylinderGeometry args={[D.glasses.tube, D.glasses.tube, D.glasses.bridge, LOW]} />
              <meshBasicMaterial color={C.glasses} />
            </mesh>
          </group>

          <mesh ref={mouth} position={[0, D.mouth.y, D.mouth.z]} rotation-z={-HALF_PI - D.mouth.arc * HALF}>
            <torusGeometry args={[D.mouth.radius, D.mouth.tube, LOW, SMOOTH, D.mouth.arc]} />
            <meshBasicMaterial color={C.eye} />
          </mesh>
          {MIRROR.map((side) => (
            <mesh key={side} position={[side * D.blush.x, D.blush.y, D.blush.z]} rotation-y={side * HALF_PI * HALF}>
              <circleGeometry args={[D.blush.radius, SMOOTH]} />
              <meshBasicMaterial color={C.blush} transparent opacity={D.blush.opacity} depthWrite={false} />
            </mesh>
          ))}

          {/* Headphones */}
          <mesh>
            <torusGeometry args={[D.phones.band, D.phones.tube, LOW, SMOOTH * DOUBLE, Math.PI]} />
            <Toon color={C.hood} />
            <Ink />
          </mesh>
          {MIRROR.map((side) => (
            <group key={side} position={[side * D.phones.cupX, 0, 0]}>
              <mesh rotation-z={HALF_PI}>
                <cylinderGeometry args={[D.phones.cupRadius, D.phones.cupRadius, D.phones.cupDepth, SMOOTH]} />
                <Toon color={palette.accent} />
                <Ink />
              </mesh>
              <mesh position={[side * D.phones.cupDepth * HALF, 0, 0]}>
                <sphereGeometry args={[D.phones.led, LOW, LOW]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            </group>
          ))}

          <Billboard position={v3(D.bubble.offset)}>
            <group ref={bubble} scale={Number.EPSILON}>
              {bubbleText ? <SpeechBubble text={bubbleText} fill={palette.line} ink={palette.surface} /> : null}
            </group>
          </Billboard>
        </group>

        <Laptop accent={palette.accent} sticker={palette.surface} glow={glow} />
        <Mug />
        <Duck fill={palette.line} ink={palette.surface} />

        <Holo spec={D.holo.code} accent={palette.accent}>
          <CodeLines accent={palette.accent} line={palette.line} fast={mode === 'typing'} />
        </Holo>
        <Holo spec={D.holo.status} accent={palette.accent}>
          <Label
            text={statusText}
            height={D.holo.labelHeight}
            maxWidth={D.holo.status.size[0] - D.holo.margin * DOUBLE}
            color={mode === 'sent' ? palette.accent : palette.line}
            position={[0, 0, D.faceOffset]}
          />
        </Holo>
      </group>
    </LookContext.Provider>
  )
}

/** A bubble sized to its measured text (shrinking long lines to `maxWidth`), so words never spill past its edge. */
function SpeechBubble({ text, fill, ink }: { text: string; fill: Color; ink: Color }) {
  const B = D.bubble
  useFontsVersion()
  const { aspect } = labelTexture(text, BUBBLE_WEIGHT, false)
  const height = Math.min(B.height, B.maxWidth / aspect)
  return (
    <group>
      <RoundedBox args={[height * aspect + B.padX, height + B.padY, B.depth]} radius={B.radius} smoothness={4}>
        <meshBasicMaterial color={fill} toneMapped={false} />
      </RoundedBox>
      <Label text={text} height={height} color={ink} weight={BUBBLE_WEIGHT} mono={false} position={[0, 0, D.faceOffset * DOUBLE]} />
    </group>
  )
}

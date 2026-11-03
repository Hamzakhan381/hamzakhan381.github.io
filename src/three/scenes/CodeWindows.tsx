import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Group } from 'three'
import config from '../scene.json'
import { useHalfWidth, useNarrow, usePalette } from '../kit'
import { scrollState } from '../../lib/scroll'
import { DOUBLE, HALF } from '../../lib/math'

const W = config.windows
const FRAME_DEPTH = 0.04
const BAR_HEIGHT = 0.22
const DOT_SIZE = 0.035
const DOT_SPACING = 0.12
const DOT_INSET = 0.18
const MARGIN = 0.22
const MAX_INDENT = 3
const ACCENT_EVERY = 4
const FLOAT_SPEED = 0.7
const FLOAT_AMOUNT = 0.12
const POINTER_TILT = 0.15
const DOT_SEGMENTS = 12
const WINDOW_TILTS = W.tilts as [number, number, number][]

type CodeLine = { x: number; y: number; width: number; accent: boolean }

function makeLines(): CodeLine[] {
  const usable = W.width - MARGIN * DOUBLE
  return Array.from({ length: W.lines }, (_, i) => {
    const indent = Math.floor(Math.random() * MAX_INDENT) * W.indent
    const width = (usable - indent) * (HALF * HALF + Math.random() * (1 - HALF * HALF))
    return {
      x: -W.width * HALF + MARGIN + indent + width * HALF,
      y: W.height * HALF - BAR_HEIGHT - MARGIN - i * W.lineGap,
      width,
      accent: i % ACCENT_EVERY === 1,
    }
  })
}

/** CV and 404: a few editor windows with abstract code floating in depth, turning as you scroll. */
export function CodeWindows() {
  const narrow = useNarrow()
  const half = useHalfWidth(W.z)
  const palette = usePalette()
  const outer = useRef<Group>(null)
  const windows = useRef<(Group | null)[]>([])
  const layouts = useMemo(() => Array.from({ length: W.count }, () => makeLines()), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    windows.current.forEach((_, i) => {
      const win = windows.current[i]
      if (win) win.position.y = (i - (W.count - 1) * HALF) * -W.spacing[i] + Math.sin(t * FLOAT_SPEED + i) * FLOAT_AMOUNT
    })
    if (outer.current) {
      outer.current.position.set(narrow ? 0 : half * W.x, (narrow ? W.mobileY : 0) + scrollState.progress * DOUBLE, W.z)
      outer.current.scale.setScalar(narrow ? W.mobileScale : 1)
      outer.current.rotation.set(scrollState.pointerY * POINTER_TILT, scrollState.progress * W.turn + scrollState.pointerX * POINTER_TILT, 0)
    }
  })

  return (
    <group ref={outer}>
      {layouts.map((lines, i) => (
        <group
          key={i}
          ref={(el) => void (windows.current[i] = el)}
          position={[(i - (W.count - 1) * HALF) * W.spacing[i], 0, -i * W.spacing[i]]}
          rotation={WINDOW_TILTS[i % WINDOW_TILTS.length]}
        >
          <mesh>
            <boxGeometry args={[W.width, W.height, FRAME_DEPTH]} />
            <meshStandardMaterial color={palette.surface} roughness={0.6} />
            <Edges color={palette.line} />
          </mesh>
          <mesh position={[0, W.height * HALF - BAR_HEIGHT, FRAME_DEPTH]}>
            <planeGeometry args={[W.width, W.barLine]} />
            <meshBasicMaterial color={palette.dim} />
          </mesh>
          {[palette.dim, palette.dim, palette.accent].map((color, k) => (
            <mesh key={k} position={[-W.width * HALF + DOT_INSET + k * DOT_SPACING, W.height * HALF - BAR_HEIGHT * HALF, FRAME_DEPTH]}>
              <circleGeometry args={[DOT_SIZE, DOT_SEGMENTS]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
          {lines.map((line) => (
            <mesh key={`${line.y}`} position={[line.x, line.y, FRAME_DEPTH]}>
              <planeGeometry args={[line.width, W.lineHeight]} />
              <meshBasicMaterial color={line.accent ? palette.accent : palette.dim} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

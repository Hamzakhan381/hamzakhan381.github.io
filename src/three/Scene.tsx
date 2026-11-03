import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import config from './scene.json'
import { CodeGlyphs } from './glyphs'
import { ArchitectureStack } from './scenes/ArchitectureStack'
import { GitGraph } from './scenes/GitGraph'
import { ServerRack } from './scenes/ServerRack'
import { NetworkGraph } from './scenes/NetworkGraph'
import { Developer } from './scenes/Developer'
import { CodeWindows } from './scenes/CodeWindows'
import { scrollState } from '../lib/scroll'
import { normalizePath } from '../lib/paths'
import { useTheme } from '../lib/theme'

const MAX_DPR = 1.75
const TOUCH_MAX_DPR = 1.5
const CAMERA_NEAR = 0.1
const CAMERA_FAR = 60
const FRAMES_BEFORE_READY = 2
const T = config.transition
const L = config.lights

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const dprCeiling = isTouch ? TOUCH_MAX_DPR : MAX_DPR

/** Which 3D scene belongs to which route; anything unknown (404) gets the code windows. */
const scenes: Record<string, ComponentType> = {
  '/': ArchitectureStack,
  '/about': GitGraph,
  '/services': ServerRack,
  '/projects': NetworkGraph,
  '/cv': CodeWindows,
  '/contact': Developer,
}
const sceneKeyFor = (pathname: string) => {
  const path = normalizePath(pathname)
  return path in scenes ? path : '*'
}

/** Pointer parallax, plus a scroll-speed "warp": the lens widens, pulls back and rolls while you scroll fast. */
function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const target = useMemo(() => new Vector3(), [])
  const motion = useRef({ warp: 0, roll: 0 })
  useFrame((_, delta) => {
    const cam = config.camera
    const [px, py] = cam.parallax
    const speed = MathUtils.clamp(scrollState.velocity / cam.velocityForFull, -1, 1)
    const m = motion.current
    m.warp = MathUtils.damp(m.warp, Math.abs(speed), cam.warpDamping, delta)
    m.roll = MathUtils.damp(m.roll, speed * cam.roll, cam.warpDamping, delta)
    camera.position.x = MathUtils.damp(camera.position.x, scrollState.pointerX * px, cam.damping, delta)
    camera.position.y = MathUtils.damp(camera.position.y, scrollState.pointerY * py, cam.damping, delta)
    camera.position.z = cam.z + m.warp * cam.dolly
    camera.lookAt(target)
    camera.rotateZ(m.roll)
    camera.fov = cam.fov + m.warp * cam.warpFov
    camera.updateProjectionMatrix()
  })
  return null
}

/** Grows a scene in from below when its page opens and lifts it away when the page closes. */
function Slot({ leaving, children }: { leaving: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null)
  const shown = useRef(0)
  useFrame((_, delta) => {
    shown.current = MathUtils.damp(shown.current, leaving ? 0 : 1, T.damping, delta)
    const g = group.current
    if (!g) return
    const v = shown.current
    g.scale.setScalar(T.minScale + v * (1 - T.minScale))
    g.position.y = (1 - v) * (leaving ? T.drift : -T.drift)
    g.rotation.y = (1 - v) * (leaving ? -1 : 1)
    g.visible = v > T.minScale
  })
  return <group ref={group}>{children}</group>
}

function SceneSwitcher({ pathname }: { pathname: string }) {
  const key = sceneKeyFor(pathname)
  const [slots, setSlots] = useState([{ key, leaving: false }])

  useEffect(() => {
    setSlots((prev) => [...prev.filter((s) => s.key !== key).map((s) => ({ ...s, leaving: true })), { key, leaving: false }])
    const timer = window.setTimeout(() => setSlots((prev) => prev.filter((s) => !s.leaving)), T.exitMs)
    return () => window.clearTimeout(timer)
  }, [key])

  return (
    <>
      {slots.map((slot) => {
        const SceneComponent = scenes[slot.key] ?? CodeWindows
        return (
          <Slot key={slot.key} leaving={slot.leaving}>
            <SceneComponent />
          </Slot>
        )
      })}
    </>
  )
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === FRAMES_BEFORE_READY) onReady()
  })
  return null
}

export default function Scene({ pathname, onReady }: { pathname: string; onReady: () => void }) {
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, dprCeiling))
  const theme = useTheme()

  return (
    <Canvas
      className="scene-canvas"
      dpr={dpr}
      camera={{ fov: config.camera.fov, near: CAMERA_NEAR, far: CAMERA_FAR, position: [0, 0, config.camera.z] }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
      aria-hidden="true"
    >
      <color attach="background" args={[config.background[theme]]} />
      <ambientLight intensity={L.ambient} />
      <directionalLight intensity={L.key} position={L.keyPosition as [number, number, number]} />
      <directionalLight intensity={L.rim} position={L.rimPosition as [number, number, number]} />
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(dprCeiling)} />
      <CameraRig />
      <CodeGlyphs />
      <SceneSwitcher pathname={pathname} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  )
}

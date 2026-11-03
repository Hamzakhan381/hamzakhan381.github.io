import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import config from './scene.json'
import { Sculpture, resolvePage } from './sculpture'
import { Dust } from './dust'
import { scrollState } from '../lib/scroll'
import { useTheme } from '../lib/theme'

const MAX_DPR = 1.75
const TOUCH_MAX_DPR = 1.5
const CAMERA_NEAR = 0.1
const CAMERA_FAR = 60
const FRAMES_BEFORE_READY = 2

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const dprCeiling = isTouch ? TOUCH_MAX_DPR : MAX_DPR

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const target = useMemo(() => new Vector3(), [])
  useFrame((_, delta) => {
    const [px, py] = config.camera.parallax
    camera.position.x = MathUtils.damp(camera.position.x, scrollState.pointerX * px, config.camera.damping, delta)
    camera.position.y = MathUtils.damp(camera.position.y, scrollState.pointerY * py, config.camera.damping, delta)
    camera.lookAt(target)
  })
  return null
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
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: false }}
      aria-hidden="true"
    >
      <color attach="background" args={[config.background[theme]]} />
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(dprCeiling)} />
      <CameraRig />
      <Dust />
      <Sculpture page={resolvePage(pathname)} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  )
}

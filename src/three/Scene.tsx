import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import layout from './layout.json'
import { CameraRig } from './rig'
import { Particles } from './particles'
import { Core } from './core'
import { ContactScene, Knot, Lights, Shapes, Tunnel } from './stations'

const MAX_DPR = 1.75
const TOUCH_MAX_DPR = 1.5
const CAMERA_NEAR = 0.1
const CAMERA_FAR = 90
const FRAMES_BEFORE_READY = 2

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const dprCeiling = isTouch ? TOUCH_MAX_DPR : MAX_DPR

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === FRAMES_BEFORE_READY) onReady()
  })
  return null
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, dprCeiling))

  return (
    <Canvas
      className="scene-canvas"
      dpr={dpr}
      camera={{ fov: layout.camera.fov, near: CAMERA_NEAR, far: CAMERA_FAR, position: [0, 0, layout.camera.distance] }}
      gl={{ antialias: !isTouch, powerPreference: 'high-performance', alpha: false, stencil: false }}
      aria-hidden="true"
    >
      <color attach="background" args={[layout.background]} />
      <fog attach="fog" args={[layout.background, layout.fog.near, layout.fog.far]} />
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(dprCeiling)} />
      <CameraRig />
      <Lights />
      <Particles />
      <Core />
      <Knot />
      <Shapes />
      <Tunnel />
      <ContactScene />
      <ReadySignal onReady={onReady} />
    </Canvas>
  )
}

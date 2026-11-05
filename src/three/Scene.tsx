import { memo, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import config from './scene.json'
import { CodeGlyphs } from './glyphs'
import { CodePortal } from './scenes/CodePortal'
import { DevPass } from './scenes/DevPass'
import { ServerRack } from './scenes/ServerRack'
import { Galaxy } from './scenes/Galaxy'
import { Developer } from './scenes/Developer'
import { CodeWindows } from './scenes/CodeWindows'
import { scrollState, useScrollLocked } from '../lib/scroll'
import { normalizePath } from '../lib/paths'
import { degrade, getQuality, useQuality } from '../lib/quality'
import { useAppLoaded } from '../lib/intro'
import { dprFor, tierSettings } from './tier'

const CAMERA_NEAR = 0.1
const CAMERA_FAR = 60
const MS_PER_SECOND = 1000
/** rAF timestamps jitter by a millisecond or two; without slack a 30 fps cap would drop to 20 on a 60 Hz screen. */
const FRAME_SLACK_MS = 2
const T = config.transition
const L = config.lights

const Q = config.quality

/** Which 3D scene belongs to which route (About: the dev pass); anything unknown (404) gets the code windows. */
const scenes: Record<string, ComponentType> = {
  '/': CodePortal,
  '/about': DevPass,
  '/services': ServerRack,
  '/projects': Galaxy,
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

/**
 * Reading a shader's error log makes the driver finish compiling it on the spot, so production skips the check:
 * each new scene's shaders then compile in the background instead of freezing the page switch.
 */
function ShaderChecks() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.debug.checkShaderErrors = import.meta.env.DEV
  }, [gl])
  return null
}

/** Grows a scene in from below when its page opens and lifts it away when the page closes. */
function Slot({ leaving, children }: { leaving: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null)
  const shown = useRef(0)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const [compiled, setCompiled] = useState(false)

  // Compile the scene's shaders in parallel (KHR_parallel_shader_compile) while it is hidden, and only start
  // growing it in once they are ready. Compiling on first draw instead blocks the main thread for a few hundred
  // milliseconds, right when a page has just opened.
  useEffect(() => {
    const g = group.current
    if (!g) return
    let live = true
    const warm = async () => {
      try {
        await gl.compileAsync(g, camera, scene)
      } catch {
        /* falls back to compiling on first draw */
      }
      if (live) setCompiled(true)
    }
    void warm()
    return () => {
      live = false
    }
  }, [gl, camera, scene])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (!compiled) {
      g.visible = false
      return
    }
    shown.current = MathUtils.damp(shown.current, leaving ? 0 : 1, T.damping, delta)
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
    // The old scene starts leaving at once. The new one is built only after the page transition has played and the
    // browser is idle: building a scene (geometry, shader compiles) takes one long frame, which would otherwise
    // land in the middle of the page-in animation and stutter it.
    setSlots((prev) => (prev.some((s) => s.key === key && !s.leaving) ? prev : prev.map((s) => ({ ...s, leaving: true }))))
    const enter = () =>
      setSlots((prev) => (prev.some((s) => s.key === key && !s.leaving) ? prev : [...prev.filter((s) => s.key !== key), { key, leaving: false }]))
    let idle = 0
    const wait = window.setTimeout(() => {
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(enter, { timeout: T.idleTimeoutMs }) : 0
      if (!idle) enter()
    }, T.enterDelayMs)
    const sweep = window.setTimeout(() => setSlots((prev) => prev.filter((s) => !s.leaving)), T.exitMs)
    return () => {
      window.clearTimeout(wait)
      window.clearTimeout(sweep)
      if (idle) window.cancelIdleCallback(idle)
    }
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

/**
 * Renders at most `fps` frames a second (the Canvas runs with frameloop "demand"), which halves GPU and
 * main-thread cost on the medium tier while the motion still reads as smooth.
 */
function FrameCap({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const interval = MS_PER_SECOND / fps
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - last < interval - FRAME_SLACK_MS) return
      last = now
      invalidate()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fps, invalidate])
  return null
}

/**
 * The scene graph itself. Memoised so the loop changes above (overlay opened, intro lifted, frame cap) and the
 * dpr changes re-render only the Canvas settings, never every mesh and label.
 */
const SceneContent = memo(function SceneContent({ pathname }: { pathname: string }) {
  return (
    <>
      <CameraRig />
      <CodeGlyphs />
      <SceneSwitcher pathname={pathname} />
    </>
  )
})

const pageVisible = () => document.visibilityState === 'visible'

/** Whether the tab is in front; the browser stops drawing frames while it isn't. */
function usePageVisible() {
  const [visible, setVisible] = useState(pageVisible)
  useEffect(() => {
    const sync = () => setVisible(pageVisible())
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  return visible
}

function frameloopFor(paused: boolean, capped: boolean) {
  if (paused) return 'never'
  return capped ? 'demand' : 'always'
}

export default function Scene({ pathname }: { pathname: string }) {
  const quality = useQuality()
  // Under the boot intro the scene is hidden: tick just often enough to compile shaders and settle, and leave the
  // main thread to the page's first render. The tier's own rate takes over as the intro lifts.
  const loaded = useAppLoaded()
  const fps = loaded ? tierSettings(quality).fps : Q.bootFps
  const [antialias] = useState(() => tierSettings(getQuality()).antialias)
  const [dpr, setDpr] = useState(() => dprFor(quality))
  const dprRef = useRef(dpr)
  // An open overlay covers the scene, so the GPU gets a break until it closes.
  const paused = useScrollLocked()
  const visible = usePageVisible()
  // The frame monitor only runs while frames are actually being drawn. A paused loop (an overlay is open) or a
  // background tab otherwise reads as one very long frame and steps the quality down on its own. Unmounting it
  // for those spells means it starts measuring afresh when drawing resumes.
  const monitoring = loaded && !paused && visible

  useEffect(() => {
    dprRef.current = dprFor(quality)
    setDpr(dprRef.current)
  }, [quality])

  /** Missed frames: first drop to 1x pixels, and if that's still not enough, step the whole tier down. */
  const lower = () => {
    if (dprRef.current > Q.minDpr) {
      dprRef.current = Q.minDpr
      setDpr(Q.minDpr)
    } else degrade()
  }
  const raise = () => {
    dprRef.current = dprFor(getQuality())
    setDpr(dprRef.current)
  }

  return (
    <Canvas
      className="scene-canvas"
      frameloop={frameloopFor(paused, fps > 0)}
      dpr={dpr}
      camera={{ fov: config.camera.fov, near: CAMERA_NEAR, far: CAMERA_FAR, position: [0, 0, config.camera.z] }}
      gl={{ antialias, powerPreference: 'high-performance', alpha: true, stencil: false }}
      // Listen on the page root so 3D objects stay clickable underneath the HTML layer.
      eventSource={document.getElementById('root') ?? undefined}
      eventPrefix="client"
      aria-hidden="true"
    >
      <ShaderChecks />
      <ambientLight intensity={L.ambient} />
      <directionalLight intensity={L.key} position={L.keyPosition as [number, number, number]} />
      <directionalLight intensity={L.rim} position={L.rimPosition as [number, number, number]} />
      {fps > 0 ? <FrameCap fps={fps} /> : null}
      {/* Frame rate means nothing while the intro throttles the scene or nothing is drawn, so watch only otherwise. */}
      {monitoring ? (
        <PerformanceMonitor
          onDecline={lower}
          onIncline={raise}
          flipflops={Q.flipflops}
          onFallback={degrade}
          // A capped loop runs at `fps` by design, so judge it against that rather than the display rate.
          bounds={fps > 0 ? () => [fps * Q.capBounds[0], fps * Q.capBounds[1]] : undefined}
        />
      ) : null}
      <SceneContent pathname={pathname} />
    </Canvas>
  )
}

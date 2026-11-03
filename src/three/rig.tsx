import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import layout from './layout.json'
import { scrollState } from '../lib/scroll'
import { HALF, clamp, lerp } from '../lib/math'

const { camera: cam, stationSpacing } = layout
const MAX_DELTA = 0.05
const POINTER_DAMPING = 2.4
const WARP_DAMPING = 4
const VELOCITY_FOR_FULL_WARP = 60
const LOOK_Y_FACTOR = 0.35
const NARROW_ASPECT = 0.85
const SMOOTHSTEP_A = 3
const SMOOTHSTEP_B = 2

type Offset = [number, number, number]
const offsets = cam.stationOffsets as Offset[]

/** Camera-smoothed values every scene object reads, so they all agree on "where we are". */
export const sceneState = { station: 0, warp: 0, pointerX: 0, pointerY: 0 }

export const stationZ = (index: number) => -index * stationSpacing

export const useNarrow = () => useThree((s) => s.size.width / s.size.height < NARROW_ASPECT)

const ease = (t: number) => t * t * (SMOOTHSTEP_A - SMOOTHSTEP_B * t)

function sampleOffset(station: number): Offset {
  const i = clamp(Math.floor(station), 0, offsets.length - 1)
  const next = Math.min(i + 1, offsets.length - 1)
  const t = ease(station - i)
  return offsets[i].map((v, axis) => lerp(v, offsets[next][axis], t)) as Offset
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const target = useMemo(() => new Vector3(), [])
  const fovBase = useRef(cam.fov)

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DELTA)
    sceneState.station = MathUtils.damp(sceneState.station, scrollState.station, cam.damping, dt)
    sceneState.pointerX = MathUtils.damp(sceneState.pointerX, scrollState.pointerX, POINTER_DAMPING, dt)
    sceneState.pointerY = MathUtils.damp(sceneState.pointerY, scrollState.pointerY, POINTER_DAMPING, dt)
    const warpTarget = clamp(Math.abs(scrollState.velocity) / VELOCITY_FOR_FULL_WARP, 0, 1)
    sceneState.warp = MathUtils.damp(sceneState.warp, warpTarget, WARP_DAMPING, dt)

    const [ox, oy, roll] = sampleOffset(sceneState.station)
    const z = stationZ(sceneState.station) + cam.distance
    camera.position.set(
      ox + sceneState.pointerX * cam.parallax[0],
      oy + sceneState.pointerY * cam.parallax[1],
      z,
    )
    target.set(ox * HALF, oy * LOOK_Y_FACTOR, z - cam.lookAhead)
    camera.lookAt(target)
    camera.rotateZ(roll)
    camera.fov = fovBase.current + sceneState.warp * cam.warpFov
    camera.updateProjectionMatrix()
  })

  return null
}

/** Shows a station's group only while the camera is close enough for it to matter. */
export function useStationVisibility(index: number, range: number) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.visible = Math.abs(sceneState.station - index) < range
  })
  return ref
}

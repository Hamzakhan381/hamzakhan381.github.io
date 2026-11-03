import { useSyncExternalStore } from 'react'

/**
 * How much the device can handle, decided once at load and lowered at runtime if frames drop.
 * - high:   full 3D, antialiasing, sharp pixel ratio
 * - medium: 3D at a lower pixel ratio, fewer background glyphs (phones, tablets, modest laptops)
 * - low:    no WebGL scene and no scroll-driven motion; static, fast pages
 */
export type Quality = 'high' | 'medium' | 'low'

const ORDER: Quality[] = ['low', 'medium', 'high']
const STORAGE_KEY = 'quality'
const LOW_CORES = 2
const LOW_MEMORY_GB = 2
const MID_CORES = 4
const MID_MEMORY_GB = 4
const DEFAULT_CORES = 8
const DEFAULT_MEMORY_GB = 8
const SOFTWARE_RENDERERS = ['swiftshader', 'llvmpipe', 'software', 'basic render']

type DeviceNavigator = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }

const systemReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True when the GPU is emulated in software (no real acceleration), where WebGL crawls. */
function softwareRendering() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase() : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return SOFTWARE_RENDERERS.some((name) => renderer.includes(name))
  } catch {
    return true
  }
}

function saved(): Quality | null {
  try {
    const value = new URLSearchParams(window.location.search).get(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY)
    return value === 'low' || value === 'medium' || value === 'high' ? value : null
  } catch {
    return null
  }
}

function detect(): Quality {
  const nav = navigator as DeviceNavigator
  const cores = nav.hardwareConcurrency || DEFAULT_CORES
  const memory = nav.deviceMemory ?? DEFAULT_MEMORY_GB
  if (systemReducedMotion || nav.connection?.saveData || cores <= LOW_CORES || memory <= LOW_MEMORY_GB || softwareRendering()) {
    return 'low'
  }
  const touch = window.matchMedia('(pointer: coarse)').matches
  return touch || cores <= MID_CORES || memory <= MID_MEMORY_GB ? 'medium' : 'high'
}

const initial: Quality = saved() ?? detect()
let current: Quality = initial
const listeners = new Set<() => void>()
document.documentElement.dataset.quality = initial

/** Motion is switched off for reduced-motion users and on low-tier devices (fixed at load). */
export const reduceMotion = systemReducedMotion || initial === 'low'
export const liteChosen = () => saved() === 'low'
export const getQuality = () => current

export function setQuality(next: Quality, remember = false) {
  current = next
  document.documentElement.dataset.quality = next
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage blocked: lite mode lasts for this visit only */
    }
  }
  listeners.forEach((notify) => notify())
}

export function forgetQuality() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing stored */
  }
}

/** Steps down one tier; called when the 3D scene keeps missing frames. */
export function degrade() {
  const index = ORDER.indexOf(current)
  if (index > 0) setQuality(ORDER[index - 1])
}

export const useQuality = () =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    getQuality,
  )

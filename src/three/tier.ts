import config from './scene.json'
import type { Quality } from '../lib/quality'

const Q = config.quality
const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Settings for a tier; the scene only mounts above 'low', so anything else means 'medium'. */
export const tierSettings = (quality: Quality) => (quality === 'high' ? Q.high : Q.medium)

export const dprFor = (quality: Quality) => {
  const tier = tierSettings(quality)
  return Math.min(window.devicePixelRatio, isTouch ? tier.touchDpr : tier.dpr)
}

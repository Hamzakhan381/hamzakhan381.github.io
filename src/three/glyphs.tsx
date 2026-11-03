import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, SpriteMaterial } from 'three'
import config from './scene.json'
import { labelTexture, useNarrow, usePalette } from './kit'
import { scrollState } from '../lib/scroll'
import { HALF } from '../lib/math'

const G = config.glyphs
const GLYPH_WEIGHT = 500
const DEPTH_SPREAD = 2
const FADE_IN = 0.12

/**
 * Background layer on every page: faint code tokens drifting upward. Scrolling flies them
 * toward the camera; each wraps back to the far plane once it passes, fading in and out.
 */
export function CodeGlyphs() {
  const narrow = useNarrow()
  const palette = usePalette()
  const group = useRef<Group>(null)
  const sprites = useRef<(Group | null)[]>([])
  const materials = useRef<(SpriteMaterial | null)[]>([])
  const count = narrow ? G.mobile : G.desktop

  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const text = G.set[i % G.set.length]
        const { texture, aspect } = labelTexture(text, GLYPH_WEIGHT)
        return {
          text,
          texture,
          aspect,
          x: (Math.random() - HALF) * G.spreadX * DEPTH_SPREAD,
          y: (Math.random() - HALF) * G.spreadY * DEPTH_SPREAD,
          phase: Math.random(),
          speed: G.rise * (HALF + Math.random()),
        }
      }),
    [count],
  )

  useFrame((_, delta) => {
    const wrapAt = G.spreadY * DEPTH_SPREAD * HALF
    sprites.current.forEach((_, i) => {
      const sprite = sprites.current[i]
      const material = materials.current[i]
      if (!sprite || !material) return
      const item = items[i]
      const nextY = sprite.position.y + delta * item.speed
      const depth = (item.phase + scrollState.progress * G.travel) % 1
      sprite.position.set(item.x, nextY > wrapAt ? -wrapAt : nextY, MathUtils.lerp(G.far, G.near, depth))
      const fadeIn = MathUtils.smoothstep(depth, 0, FADE_IN)
      const fadeOut = 1 - MathUtils.smoothstep(depth, G.fadeNear, 1)
      material.opacity = G.opacity * fadeIn * fadeOut
    })
    if (group.current) group.current.position.y = scrollState.progress * G.parallax
  })

  return (
    <group ref={group}>
      {items.map((item, i) => (
        <group key={`${item.text}-${i}`} ref={(el) => void (sprites.current[i] = el)} position={[item.x, item.y, G.far]}>
          <sprite scale={[G.size * item.aspect, G.size, 1]}>
            <spriteMaterial
              ref={(el) => void (materials.current[i] = el)}
              map={item.texture}
              color={palette.line}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}
    </group>
  )
}

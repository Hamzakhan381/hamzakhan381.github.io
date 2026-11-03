import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import config from './scene.json'
import { labelTexture, useNarrow, usePalette } from './kit'
import { scrollState } from '../lib/scroll'
import { HALF } from '../lib/math'

const G = config.glyphs
const GLYPH_WEIGHT = 500

/** Background layer on every page: faint code tokens drifting upward with scroll parallax. */
export function CodeGlyphs() {
  const narrow = useNarrow()
  const palette = usePalette()
  const group = useRef<Group>(null)
  const sprites = useRef<(Group | null)[]>([])
  const count = narrow ? G.mobile : G.desktop

  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const text = G.set[i % G.set.length]
        const { texture, aspect } = labelTexture(text, GLYPH_WEIGHT)
        const depth = G.near + Math.random() * (G.far - G.near)
        return {
          text,
          texture,
          aspect,
          x: (Math.random() - HALF) * G.spreadX * (1 - depth / G.far + 1),
          y: (Math.random() - HALF) * G.spreadY * DEPTH_SPREAD,
          z: depth,
          speed: G.rise * (HALF + Math.random()),
        }
      }),
    [count],
  )

  useFrame((_, delta) => {
    sprites.current.forEach((_, i) => {
      const sprite = sprites.current[i]
      if (!sprite) return
      const wrapAt = G.spreadY * DEPTH_SPREAD * HALF
      const next = sprite.position.y + delta * items[i].speed
      sprite.position.y = next > wrapAt ? -wrapAt : next
    })
    if (group.current) group.current.position.y = scrollState.progress * G.parallax
  })

  return (
    <group ref={group}>
      {items.map((item, i) => (
        <group key={`${item.text}-${i}`} ref={(el) => void (sprites.current[i] = el)} position={[item.x, item.y, item.z]}>
          <sprite scale={[G.size * item.aspect, G.size, 1]}>
            <spriteMaterial map={item.texture} color={palette.line} transparent opacity={G.opacity} depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </group>
  )
}

const DEPTH_SPREAD = 2

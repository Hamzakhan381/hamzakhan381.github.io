import { createContext, useContext, useMemo } from 'react'
import { Outlines } from '@react-three/drei'
import { Color, DataTexture, DoubleSide, NearestFilter, RedFormat } from 'three'

/**
 * The cartoon look shared by the site's characters: cel shading from a few hard tone steps, and ink outlines in
 * the theme's line colour. A character wraps its meshes in <LookContext.Provider> and gives each mesh <Toon> and
 * <Ink> children.
 */
export type Look = { gradient: DataTexture; ink: Color; outline: number }
export const LookContext = createContext<Look | null>(null)

export function Toon({ color, side, map }: { color: Color | string; side?: typeof DoubleSide; map?: import('three').Texture | null }) {
  const look = useContext(LookContext)
  return <meshToonMaterial color={color} gradientMap={look?.gradient} side={side} map={map ?? null} />
}

/**
 * The ink outline. `smooth` is for shapes whose normals are already smooth (spheres, capsules, tori): drei would
 * otherwise rebuild each one's normals with a crease pass when the scene opens (most of the cartoon's start-up cost),
 * which only boxes and cylinders need to keep their outlines closed at the corners.
 */
export function Ink({ smooth = false }: { smooth?: boolean }) {
  const look = useContext(LookContext)
  return <Outlines thickness={look?.outline ?? 0} color={look?.ink} angle={smooth ? 0 : Math.PI} />
}

/** A 1×N tone ramp; nearest filtering keeps the steps hard, which is what makes it read as cel shading. */
export function useToonGradient(tones: number[]) {
  return useMemo(() => {
    const texture = new DataTexture(Uint8Array.from(tones), tones.length, 1, RedFormat)
    texture.minFilter = NearestFilter
    texture.magFilter = NearestFilter
    texture.needsUpdate = true
    return texture
  }, [tones])
}

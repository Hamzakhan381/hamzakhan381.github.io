import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial } from 'three'
import config from './scene.json'
import { dustFragment, dustVertex } from './shaders'
import { useNarrow } from './sculpture'
import { scrollState } from '../lib/scroll'
import { useTheme } from '../lib/theme'
import { HALF } from '../lib/math'

const D = config.dust
const DRIFT = 0.01
const LIGHT_OPACITY = 0.55

/** Sparse background motes that rise with scroll, adding parallax depth behind the sculpture. */
export function Dust() {
  const narrow = useNarrow()
  const theme = useTheme()
  const dpr = useThree((s) => s.viewport.dpr)
  const ref = useRef<Points>(null)
  const material = useRef<ShaderMaterial>(null)
  const count = narrow ? D.mobile : D.desktop

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const coords = Array.from({ length: count }, () => [
      (Math.random() - HALF) * D.spread,
      (Math.random() - HALF) * D.spread,
      -Math.random() * D.depth,
    ])
    g.setAttribute('position', new BufferAttribute(Float32Array.from(coords.flat()), coords[0].length))
    g.setAttribute('aSeed', new BufferAttribute(Float32Array.from({ length: count }, Math.random), 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: D.size },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color() },
      uOpacity: { value: 1 },
    }),
    [],
  )

  useEffect(() => {
    uniforms.uPixelRatio.value = dpr
  }, [dpr, uniforms])

  useEffect(() => {
    uniforms.uColor.value.set(config.palette[theme].base)
    uniforms.uOpacity.value = theme === 'dark' ? 1 : LIGHT_OPACITY
    if (!material.current) return
    material.current.blending = theme === 'dark' ? AdditiveBlending : NormalBlending
    material.current.needsUpdate = true
  }, [theme, uniforms])

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime
    if (!ref.current) return
    ref.current.position.y = scrollState.progress * D.rise
    ref.current.rotation.z += delta * DRIFT
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={dustVertex}
        fragmentShader={dustFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

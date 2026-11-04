import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'
import config from './scene.json'
import { tierSettings } from './tier'
import { scrollState } from '../lib/scroll'
import { useQuality } from '../lib/quality'
import { DOUBLE, HALF } from '../lib/math'

const G = config.glyphs
const FONT_PX = 96
const CELL_PAD = 1.3
const DEPTH_SPREAD = 2
const FADE_IN = 0.12
const UV_STRIDE = 4
const MIN_ALPHA = 0.01

/** All glyph strings drawn once into a grid texture, with each one's UV rectangle and aspect ratio. */
function buildAtlas(set: string[]) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const font = `500 ${FONT_PX}px "Geist Mono", ui-monospace, monospace`
  if (ctx) ctx.font = font
  const widths = set.map((text) => (ctx ? ctx.measureText(text).width : text.length * FONT_PX) + FONT_PX * HALF)
  const cellW = Math.ceil(Math.max(...widths))
  const cellH = Math.ceil(FONT_PX * CELL_PAD)
  const cols = Math.ceil(Math.sqrt(set.length))
  const rows = Math.ceil(set.length / cols)
  canvas.width = cols * cellW
  canvas.height = rows * cellH
  if (ctx) {
    ctx.font = font
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
  }
  const rects = set.map((text, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    ctx?.fillText(text, (col + HALF) * cellW, (row + HALF) * cellH)
    const w = widths[i]
    return {
      uv: [((col + HALF) * cellW - w * HALF) / canvas.width, 1 - ((row + 1) * cellH) / canvas.height, w / canvas.width, cellH / canvas.height],
      aspect: w / cellH,
    }
  })
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { texture, rects }
}

const vertex = /* glsl */ `
attribute vec4 aUv;
attribute float aAlpha;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vUv = aUv.xy + uv * aUv.zw;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
varying vec2 vUv;
varying float vAlpha;
void main() {
  float a = texture2D(uMap, vUv).a * vAlpha;
  if (a < ${MIN_ALPHA}) discard;
  gl_FragColor = vec4(uColor, a);
}
`

/**
 * Background layer on every page: faint code tokens drifting upward. Scrolling flies them toward
 * the camera; each wraps back to the far plane once it passes, fading in and out. Every glyph is
 * one instance of a single mesh sharing one texture, so the whole field is a single draw call.
 */
export function CodeGlyphs() {
  const quality = useQuality()
  const count = tierSettings(quality).glyphs
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const atlas = useMemo(() => buildAtlas(G.set), [])
  useEffect(() => () => atlas.texture.dispose(), [atlas])

  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        glyph: i % G.set.length,
        x: (Math.random() - HALF) * G.spreadX * DEPTH_SPREAD,
        y: (Math.random() - HALF) * G.spreadY * DEPTH_SPREAD,
        phase: Math.random(),
        speed: G.rise * (HALF + Math.random()),
      })),
    [count],
  )

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.setAttribute('aUv', new InstancedBufferAttribute(Float32Array.from(items.flatMap((it) => atlas.rects[it.glyph].uv)), UV_STRIDE))
    g.setAttribute('aAlpha', new InstancedBufferAttribute(new Float32Array(items.length), 1))
    return g
  }, [items, atlas])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({ uMap: { value: atlas.texture }, uColor: { value: new Color(G.color) } }), [atlas])

  useFrame((state) => {
    const target = mesh.current
    if (!target) return
    const t = state.clock.elapsedTime
    const wrapAt = G.spreadY * DEPTH_SPREAD * HALF
    const alpha = geometry.getAttribute('aAlpha') as InstancedBufferAttribute
    const opacity = G.opacity
    items.forEach((item, i) => {
      const depth = (item.phase + scrollState.progress * G.travel) % 1
      const rise = ((item.y + t * item.speed + wrapAt) % (wrapAt * DOUBLE)) - wrapAt
      dummy.position.set(item.x, rise + scrollState.progress * G.parallax, MathUtils.lerp(G.far, G.near, depth))
      dummy.scale.set(G.size * atlas.rects[item.glyph].aspect, G.size, 1)
      dummy.updateMatrix()
      target.setMatrixAt(i, dummy.matrix)
      alpha.setX(i, opacity * MathUtils.smoothstep(depth, 0, FADE_IN) * (1 - MathUtils.smoothstep(depth, G.fadeNear, 1)))
    })
    target.instanceMatrix.needsUpdate = true
    alpha.needsUpdate = true
  })

  if (!count) return null
  return (
    <instancedMesh key={count} ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}


const noise3d = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

export const coreVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
${noise3d}
void main() {
  float n = snoise(position * uFreq + vec3(uTime * 0.22));
  float detail = snoise(position * uFreq * 2.4 - vec3(uTime * 0.35)) * 0.35;
  vec3 displaced = position + normal * (n + detail) * uAmp;
  vNoise = n * 0.5 + 0.5;
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vView = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`

export const coreFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRim;
uniform float uTime;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.15, 0.85, vNoise));
  float contour = smoothstep(0.9, 1.0, sin(vNoise * 70.0 - uTime * 1.6));
  col += contour * 0.22 * uColorB;
  col = mix(col, uRim, fresnel);
  col += fresnel * 0.55;
  gl_FragColor = vec4(col, uOpacity);
}
`

export const particleVertex = /* glsl */ `
attribute float aScale;
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uWarp;
uniform float uFogNear;
uniform float uFogFar;
varying float vSeed;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.4 + aSeed * 40.0);
  gl_PointSize = uSize * aScale * uPixelRatio * (1.0 + uWarp) / -mv.z;
  vSeed = aSeed;
  vAlpha = twinkle * smoothstep(uFogFar, uFogNear, -mv.z);
}
`

export const particleFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vSeed;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(uColorA, uColorB, vSeed);
  col = mix(col, vec3(1.0), step(0.92, vSeed));
  gl_FragColor = vec4(col, a * a * vAlpha);
}
`

export const gridVertex = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vHeight;
varying float vDepth;
${noise3d}
void main() {
  vec3 p = position;
  float h = sin(p.x * 0.17 + uTime * 0.55) * 0.55
          + cos(p.y * 0.21 + uTime * 0.4) * 0.55
          + snoise(vec3(p.xy * 0.07, uTime * 0.08)) * 1.6;
  float valley = smoothstep(3.0, 16.0, abs(p.x));
  p.z += h * valley;
  vHeight = h * valley;
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

export const gridFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uCells;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
varying vec2 vUv;
varying float vHeight;
varying float vDepth;
void main() {
  vec2 g = vUv * uCells;
  vec2 w = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(w.x, w.y), 1.0);
  vec3 col = mix(uColorA, uColorB, clamp(vHeight * 0.35 + 0.5, 0.0, 1.0));
  float fade = smoothstep(uFogFar, uFogNear, vDepth);
  gl_FragColor = vec4(col * (line * 1.5 + 0.06), (line * 0.85 + 0.04) * fade * uOpacity);
}
`

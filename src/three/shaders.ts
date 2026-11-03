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

export const sculptureVertex = /* glsl */ `
attribute vec3 aTo;
attribute float aDelay;
attribute float aSeed;
uniform float uProgress;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uScatter;
uniform float uSwirl;
uniform float uOpacity;
uniform vec3 uPointer;
uniform float uPointerRadius;
uniform float uPointerForce;
varying float vSeed;
varying float vAlpha;
${noise3d}
void main() {
  float stagger = 0.4;
  float p = clamp((uProgress - aDelay * stagger) / (1.0 - stagger), 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  vec3 pos = mix(position, aTo, p);
  vec3 q = pos * 0.55 + vec3(uTime * 0.18);
  vec3 swirl = vec3(snoise(q), snoise(q + 17.3), snoise(q + 41.7));
  pos += swirl * (sin(p * 3.14159265) * uSwirl + uScatter);
  vec3 away = pos - uPointer;
  float dist = length(away) + 0.0001;
  pos += (away / dist) * smoothstep(uPointerRadius, 0.0, dist) * uPointerForce;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.45 + aSeed * 0.9) * uPixelRatio / -mv.z;
  vSeed = aSeed;
  vAlpha = uOpacity * (0.6 + 0.4 * sin(uTime * 1.7 + aSeed * 60.0));
}
`

export const sculptureFragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uAccentRatio;
varying float vSeed;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.08, d);
  vec3 col = mix(uBase, uAccent, step(1.0 - uAccentRatio, vSeed));
  gl_FragColor = vec4(col, a * vAlpha);
}
`

export const dustVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.2 + aSeed * 20.0) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.3 + aSeed) * uPixelRatio / -mv.z;
  vAlpha = (0.25 + 0.35 * sin(uTime * 0.9 + aSeed * 40.0)) * smoothstep(40.0, 6.0, -mv.z);
}
`

export const dustFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vAlpha * uOpacity);
}
`
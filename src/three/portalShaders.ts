/**
 * Shaders for the Home page's code portal: a tunnel of code glyphs seen head-on. Each point sits on the tunnel wall
 * at an angle and a depth; depth flows towards the camera over time (faster during the dive), the angle twists
 * with depth so the tunnel reads as a vortex, and every point samples one glyph out of a 4×4 atlas.
 */
export const portalVertex = /* glsl */ `
attribute float aAngle;
attribute float aRadius;
attribute float aDepth;
attribute float aGlyph;
attribute float aSeed;
uniform float uTime;
uniform float uFlow;
uniform float uSpin;
uniform float uLength;
uniform float uRadius;
uniform float uTwist;
uniform float uSize;
uniform float uMaxSize;
uniform float uPixelRatio;
uniform float uOpacity;
varying float vGlyph;
varying float vSeed;
varying float vAlpha;
void main() {
  float d = fract(aDepth - uFlow);
  float a = aAngle + uSpin + d * uTwist;
  float r = uRadius * aRadius;
  vec3 pos = vec3(cos(a) * r, sin(a) * r, -d * uLength);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.001);
  gl_PointSize = min(uSize * (0.55 + aSeed * 0.9) * uPixelRatio / depth, uMaxSize * uPixelRatio);
  // Fade in as points leave the far end, out as they reach the mouth, and drop anything behind the camera.
  float fade = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.72, 1.0, d)) * step(0.4, -mv.z);
  vAlpha = uOpacity * fade * (0.55 + 0.45 * sin(uTime * 2.1 + aSeed * 40.0));
  vGlyph = aGlyph;
  vSeed = aSeed;
}
`

export const portalFragment = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uAccentRatio;
varying float vGlyph;
varying float vSeed;
varying float vAlpha;
void main() {
  float col = mod(vGlyph, 4.0);
  float row = floor(vGlyph / 4.0);
  vec2 uv = vec2((col + gl_PointCoord.x) / 4.0, 1.0 - (row + gl_PointCoord.y) / 4.0);
  float ink = texture2D(uAtlas, uv).a;
  if (ink < 0.05) discard;
  vec3 c = mix(uBase, uAccent, step(1.0 - uAccentRatio, vSeed));
  gl_FragColor = vec4(c, ink * vAlpha);
}
`

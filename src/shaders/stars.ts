/**
 * Star point-sprites. Each star has its own size, brightness, tint, twinkle
 * phase/rate and optional "flare" length. The fragment shader draws a soft
 * core, a faint halo and thin horizontal/vertical rays (the diffraction spike)
 * procedurally, so no texture is required.
 */
export const starsVertex = /* glsl */ `
attribute float aSize;
attribute float aBright;
attribute vec3 aTint;
attribute float aPhase;
attribute float aRate;
attribute float aFlare;

uniform float uTime;
uniform float uPixelRatio;
uniform float uAttenuate;

varying float vSize;
varying float vFlare;
varying float vRaster;
varying float vBright;
varying vec3 vColor;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = -mv.z;

  // near stars grow/shrink with distance; far sky stays a fixed pixel size
  float att = mix(1.0, clamp(24.0 / max(dist, 0.001), 0.5, 2.2), uAttenuate);
  float tw = 0.45 + 0.55 * sin(uTime * aRate * 1.6 + aPhase);

  float size = aSize * att * uPixelRatio;
  float flare = aFlare * att * uPixelRatio * (0.85 + 0.15 * tw);

  vSize = size;
  vFlare = flare;
  vRaster = min(max(max(size * 5.0, flare), 4.0), 64.0);
  vColor = aTint;

  // fade stars that pass very close to the camera
  float nearFade = mix(1.0, smoothstep(1.0, 6.0, dist), uAttenuate);
  vBright = aBright * tw * nearFade;

  gl_PointSize = vRaster;
  gl_Position = projectionMatrix * mv;
}
`;

export const starsFragment = /* glsl */ `
varying float vSize;
varying float vFlare;
varying float vRaster;
varying float vBright;
varying vec3 vColor;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float spriteR = length(uv) * 2.0;
  if (spriteR > 1.0) discard;

  vec2 p = uv * vRaster;
  float s = max(vSize, 0.8);
  float r2 = dot(p, p);
  float edgeFade = 1.0 - smoothstep(0.72, 1.0, spriteR);

  float core = exp(-r2 / (0.32 * s * s));
  float halo = exp(-sqrt(r2) / (s * 1.8)) * 0.10 * smoothstep(1.2, 3.0, s);

  float rays = 0.0;
  if (vFlare > 0.5) {
    float hx = max(0.0, 1.0 - abs(p.x) / (vFlare * 0.5));
    float hy = max(0.0, 1.0 - abs(p.y) / (vFlare * 0.5));
    float horiz = exp(-abs(p.y) / 0.65) * hx * hx * hx;
    float vert = exp(-abs(p.x) / 0.65) * hy * hy * hy;
    rays = max(horiz, vert) * 0.85;
  }

  float a = clamp(max(core + halo, rays), 0.0, 1.0) * vBright * edgeFade;
  if (a < 0.004) discard;

  vec3 c = mix(vColor, vec3(1.0), core * 0.45);
  gl_FragColor = vec4(c, a);

  #include <colorspace_fragment>
}
`;

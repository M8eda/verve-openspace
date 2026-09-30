export const galaxyVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aBrightness;
attribute float aScale;
attribute float aDepthSeed;
attribute float aPhase;
attribute float aRate;

uniform float uExpansion;
uniform float uTime;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vBright;
varying float vSize;

void main() {
  // Virtual depth: each star sits at a different "distance" in the galaxy.
  // As uExpansion increases the virtual camera pushes forward, making
  // closer stars fly past while distant ones approach.
  float startDepth = mix(4.0, 16.0, aDepthSeed);
  float travel = uExpansion * 22.0;
  float effectiveDepth = startDepth - travel;
  float approach = startDepth / max(1.0, effectiveDepth);

  vec3 pos = position * approach;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Size scales with virtual approach
  float baseSize = aScale * uPixelRatio;
  float size = baseSize * min(approach, 12.0);
  gl_PointSize = clamp(size, 0.5, 56.0);
  vSize = size;

  // Fade when star has flown past the virtual camera
  float behindFade = smoothstep(0.5, 3.5, effectiveDepth);
  // Global dissolve toward end of galaxy phase
  float globalFade = 1.0 - smoothstep(0.6, 1.0, uExpansion);
  // Twinkle
  float twinkle = 0.5 + 0.5 * sin(uTime * aRate * 1.8 + aPhase);

  vBright = aBrightness * behindFade * globalFade * twinkle;
  vColor = aColor;
}
`;

export const galaxyFragment = /* glsl */ `
varying vec3 vColor;
varying float vBright;
varying float vSize;

void main() {
  vec2 p = (gl_PointCoord - 0.5) * 2.0;
  float r = length(p);
  if (r > 1.0) discard;
  float edgeFade = 1.0 - smoothstep(0.72, 1.0, r);

  // Soft disc
  float disc = 1.0 - smoothstep(0.0, 1.0, r);
  disc = pow(disc, 2.0);

  // Cross-ray flares for brighter/larger stars
  float rays = 0.0;
  if (vSize > 3.0) {
    float intensity = smoothstep(3.0, 10.0, vSize);
    float hx = exp(-abs(p.y) * 5.0) * exp(-abs(p.x) * 0.9);
    float hy = exp(-abs(p.x) * 5.0) * exp(-abs(p.y) * 0.9);
    rays = max(hx, hy) * 0.4 * intensity;
  }

  float alpha = clamp(disc + rays, 0.0, 1.0) * vBright * edgeFade;
  if (alpha < 0.003) discard;

  // White-shift the core for brighter stars
  vec3 col = mix(vColor, vec3(1.0), disc * disc * 0.35);

  gl_FragColor = vec4(col, alpha);

  #include <colorspace_fragment>
}
`;

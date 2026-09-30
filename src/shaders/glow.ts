/**
 * Analytic glow drawn on a camera-facing quad behind/around the core.
 * No post-processing pass: the falloff is computed directly per pixel.
 * Coordinates are in "core radii": r = 1 is the edge of the star.
 */
export const glowVertex = /* glsl */ `
uniform float uHalf;
uniform float uSize;
varying vec2 vP;

void main() {
  vP = (uv - 0.5) * 2.0 * uHalf;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}
`;

export const glowFragment = /* glsl */ `
uniform vec3 uGlow;
uniform float uStrength;
varying vec2 vP;

void main() {
  float r = length(vP);
  float outside = max(r - 1.0, 0.0);

  // tight bright rim right at the limb
  float rim = exp(-pow((r - 1.02) / 0.06, 2.0));

  // strong near halo + long, faint tail, faded out before the quad edge
  float halo = exp(-outside * 4.2) * 0.30 + exp(-outside * 1.0) * 0.05;
  float fade = 1.0 - smoothstep(4.0, 7.0, r);

  vec3 light = uGlow * halo * fade * 2.4 * uStrength
             + mix(uGlow, vec3(1.0), 0.15) * rim * 1.1 * uStrength;

  gl_FragColor = vec4(light, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

import { NOISE_GLSL } from "./noise";

/** Very faint blue-teal nebula haze painted on a huge inside-out sphere. */
export const hazeVertex = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export type HazeQuality = "full" | "cheap" | "gradient";

/**
 * Three quality tiers:
 *  - "full"     — 4-octave fbm, desktop only
 *  - "cheap"    — 2-octave fbm, tablets or mid-range mobile
 *  - "gradient" — analytic gradient, no noise at all, for phones whose
 *                 mobile GPU can't survive per-pixel noise on a fullscreen sphere
 */
export function hazeFragment(quality: HazeQuality) {
  if (quality === "gradient") {
    return /* glsl */ `
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);

  // Analytic haze: vertical gradient + soft cinematic color blooms, zero noise
  float zenith = d.y * 0.5 + 0.5;
  float coreGlow = exp(-pow(length(d.xz), 2.0) * 1.8) * 0.5;
  float teal = smoothstep(0.08, 0.75, zenith * 0.45 + coreGlow * 0.5);
  float blueCloud = exp(-pow(length(d.xy - vec2(-0.28, 0.18)), 2.0) * 4.0);
  float amberCloud = exp(-pow(length(d.xy - vec2(0.34, -0.12)), 2.0) * 6.0);

  vec3 base = vec3(0.0004, 0.0010, 0.0025);
  vec3 color = base;
  color += vec3(0.003, 0.018, 0.026) * teal;
  color += vec3(0.006, 0.016, 0.04) * blueCloud * 0.65;
  color += vec3(0.025, 0.012, 0.004) * amberCloud * 0.35;

  gl_FragColor = vec4(color, 1.0);

  #include <colorspace_fragment>
}
`;
  }

  return /* glsl */ `
varying vec3 vDir;

${NOISE_GLSL}

void main() {
  vec3 d = normalize(vDir);
  float n = ${quality === "cheap" ? "fbm2" : "fbm"}(d * 1.8 + vec3(3.0, 1.0, 7.0));
  float m = smoothstep(0.38, 0.82, n);
  float blueCloud = smoothstep(0.35, 0.78, ${quality === "cheap" ? "fbm2" : "fbm"}(d * 2.2 + vec3(-4.0, 8.0, 2.0)));
  float amberCloud = smoothstep(0.48, 0.9, ${quality === "cheap" ? "fbm2" : "fbm"}(d * 2.8 + vec3(9.0, -3.0, 6.0)));

  vec3 base = vec3(0.0004, 0.0010, 0.0025);
  vec3 color = base;
  color += vec3(0.003, 0.018, 0.026) * m;
  color += vec3(0.006, 0.016, 0.04) * blueCloud * 0.75;
  color += vec3(0.028, 0.012, 0.004) * amberCloud * 0.32;

  gl_FragColor = vec4(color, 1.0);

  #include <colorspace_fragment>
}
`;
}

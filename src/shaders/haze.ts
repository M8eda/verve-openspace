import { NOISE_GLSL } from "./noise";

/** Faint blue-teal nebula haze painted on a huge inside-out sphere. */
export const hazeVertex = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Samples the haze Haze.tsx bakes into a cube map at startup. The noise only
 * depends on direction, so one texture read reproduces it.
 */
export const hazeBakedFragment = /* glsl */ `
uniform samplerCube uHaze;
varying vec3 vDir;

void main() {
  gl_FragColor = vec4(textureCube(uHaze, vDir).rgb, 1.0);

  #include <colorspace_fragment>
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

  float zenith = d.y * 0.5 + 0.5;
  float coreGlow = exp(-pow(length(d.xz), 2.0) * 1.8) * 0.5;
  float teal = smoothstep(0.08, 0.75, zenith * 0.45 + coreGlow * 0.5);
  float band = exp(-pow(dot(d, normalize(vec3(0.18, 0.92, -0.34))), 2.0) * 10.0);
  float cyanCloud = smoothstep(0.52, 0.96, dot(d, normalize(vec3(-0.62, 0.26, -0.74))));
  float violetCloud = smoothstep(0.54, 0.96, dot(d, normalize(vec3(0.58, 0.22, -0.78))));
  float roseCloud = smoothstep(0.58, 0.98, dot(d, normalize(vec3(-0.24, -0.42, 0.88))));
  float amberCloud = smoothstep(0.62, 0.98, dot(d, normalize(vec3(0.28, -0.1, 0.95))));

  vec3 base = vec3(0.0004, 0.0010, 0.0025);
  vec3 color = base;
  color += vec3(0.003, 0.018, 0.026) * teal;
  color += vec3(0.008, 0.032, 0.055) * band * 0.45;
  color += vec3(0.015, 0.055, 0.072) * cyanCloud * 0.58;
  color += vec3(0.038, 0.022, 0.07) * violetCloud * 0.48;
  color += vec3(0.052, 0.018, 0.048) * roseCloud * 0.34;
  color += vec3(0.062, 0.026, 0.006) * amberCloud * 0.18;

  gl_FragColor = vec4(min(color, vec3(0.12)), 1.0);

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
  float wisp = ${quality === "cheap" ? "fbm2" : "fbm"}(d * 3.1 + vec3(-4.0, 8.0, 2.0));
  float grain = ${quality === "cheap" ? "fbm2" : "fbm"}(d * 4.6 + vec3(9.0, -3.0, 6.0));

  float smoke = smoothstep(0.34, 0.82, n);
  float strands = smoothstep(0.46, 0.88, wisp) * (0.35 + 0.65 * grain);
  float band = exp(-pow(dot(d, normalize(vec3(0.18, 0.92, -0.34))), 2.0) * 10.0);

  float cyanCloud = smoothstep(0.52, 0.97, dot(d, normalize(vec3(-0.62, 0.26, -0.74)))) * (0.5 + strands * 0.8);
  float violetCloud = smoothstep(0.54, 0.97, dot(d, normalize(vec3(0.58, 0.22, -0.78)))) * (0.45 + smoke * 0.7);
  float roseCloud = smoothstep(0.58, 0.98, dot(d, normalize(vec3(-0.24, -0.42, 0.88)))) * (0.35 + strands * 0.8);
  float amberCloud = smoothstep(0.62, 0.98, dot(d, normalize(vec3(0.28, -0.1, 0.95)))) * (0.3 + smoke * 0.55);

  vec3 base = vec3(0.0004, 0.0010, 0.0025);
  vec3 color = base;
  color += vec3(0.003, 0.018, 0.026) * smoke;
  color += vec3(0.008, 0.034, 0.058) * band * smoke * 0.72;
  color += vec3(0.018, 0.062, 0.082) * cyanCloud * 0.62;
  color += vec3(0.044, 0.026, 0.086) * violetCloud * 0.54;
  color += vec3(0.06, 0.02, 0.052) * roseCloud * 0.38;
  color += vec3(0.07, 0.032, 0.008) * amberCloud * 0.22;

  gl_FragColor = vec4(min(color, vec3(0.12)), 1.0);

  #include <colorspace_fragment>
}
`;
}

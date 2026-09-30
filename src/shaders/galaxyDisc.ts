export const galaxyDiscVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const galaxyDiscFragment = /* glsl */ `
uniform float uTime;
uniform float uExpansion;

varying vec2 vUv;

#define PI  3.14159265
#define TAU 6.28318530

float ghash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(ghash(i), ghash(i + vec2(1.0, 0.0)), f.x),
    mix(ghash(i + vec2(0.0, 1.0)), ghash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float gfbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * gnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);

  if (r > 0.97) discard;

  float theta = atan(p.y, p.x);
  float spin = uTime * 0.02;

  // --- spiral arm density (4 arms) ---
  float wind = 2.0;
  float arms = 0.0;
  for (int i = 0; i < 4; i++) {
    float phi = float(i) * PI * 0.5;
    float spiralTheta = wind * log(max(r, 0.005)) + phi + spin;
    float delta = mod(theta - spiralTheta + PI, TAU) - PI;
    float width = 0.32 + r * 0.2;
    arms += exp(-delta * delta / (width * width));
  }
  arms = min(arms, 1.4);

  // noise breaks up the arms
  float n = gfbm(p * 4.0 + vec2(uTime * 0.008, uTime * -0.005));
  arms *= 0.65 + 0.35 * n;

  // inter-arm dust (fainter fill between arms)
  float dust = gfbm(p * 6.0 - vec2(uTime * 0.003)) * 0.25;

  // central bulge
  float bulge = exp(-r * r * 16.0) * 1.8;

  // overall density with soft edge
  float edge = 1.0 - smoothstep(0.6, 0.97, r);
  float density = (arms * 0.5 + dust + bulge) * edge;

  // --- color ---
  vec3 coreCol  = vec3(1.0,  0.95, 0.78);
  vec3 armCol   = vec3(0.32, 0.52, 0.88);
  vec3 emerald  = vec3(0.48, 0.88, 0.35);
  vec3 dustCol  = vec3(0.18, 0.22, 0.38);

  vec3 col = mix(armCol, coreCol, smoothstep(0.0, 0.25, bulge));
  col = mix(col, emerald, arms * 0.14 * (1.0 - r * 0.8));
  col = mix(col, dustCol, dust * 0.6);
  col += coreCol * bulge * 0.3;

  // fade during zoom-in
  float fade = 1.0 - smoothstep(0.35, 0.85, uExpansion);

  float alpha = clamp(density * 0.55 * fade, 0.0, 1.0);
  if (alpha < 0.002) discard;

  gl_FragColor = vec4(col * alpha, alpha);

  #include <colorspace_fragment>
}
`;

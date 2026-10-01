import { NOISE_GLSL } from "./noise";

export const ringVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Planet rings. Every mode sits on a faint band of dust and draws its
 * service motif (release tracks, channel bands, rank ladders...) in the
 * planet's own uColor/uAccent, so no two systems share a palette. The
 * planet casts its shadow across the ring.
 */
export const ringFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uLightDir;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform float uTime;
uniform int uMode;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;

${NOISE_GLSL}

float band(float r, float centre, float width) {
  return 1.0 - smoothstep(width, width * 2.2, abs(r - centre));
}

float packet(float a, float speed, float offset, float sharpness) {
  return exp(-pow(fract(a - uTime * speed + offset) - 0.5, 2.0) * sharpness);
}

float dashes(float a, float count, float duty) {
  float f = fract(a * count);
  return smoothstep(0.04, 0.12, f) * (1.0 - smoothstep(duty, duty + 0.14, f));
}

float ticks(float a, float count, float width) {
  return 1.0 - smoothstep(width, width * 2.5, abs(fract(a * count) - 0.5));
}

void main() {
  float r = distance(vUv, vec2(0.5)) * 2.0;
  if (r < 0.65 || r > 1.0) discard;

  vec2 centered = vUv - vec2(0.5);
  float angle = atan(centered.y, centered.x);
  float a = angle / 6.2831853 + 0.5;

  vec3 L = normalize(uLightDir);
  // Planet shadow: does the path towards the core pass through the sphere?
  vec3 toCenter = uPlanetCenter - vWorld;
  float along = dot(toCenter, L);
  float miss = length(toCenter - L * along);
  float shadow = along > 0.0 ? smoothstep(uPlanetRadius * 0.92, uPlanetRadius * 1.04, miss) : 1.0;
  float light = (0.3 + 0.7 * abs(dot(normalize(vNormalW), L))) * (0.12 + 0.88 * shadow);

  vec3 c1 = uColor;
  vec3 c2 = mix(uColor, uAccent, 0.55);
  vec3 c3 = uAccent;
  vec3 hot = mix(uAccent, vec3(1.0), 0.45);

  // Shared dust: fine striations with a darker gap, like real ring systems.
  float strands = 0.55 + 0.45 * vnoise(vec3(r * 90.0, 0.0, 0.0));
  float dustShape = smoothstep(0.66, 0.74, r) * (1.0 - smoothstep(0.9, 0.99, r));
  float gap = 1.0 - band(r, 0.8, 0.008) * 0.8;
  float dust = dustShape * strands * gap;
  vec3 color = mix(c1, c3, strands) * dust * 0.35;
  float alpha = dust * 0.16;

  if (uMode == 8) {
    // Email: lifecycle lanes with timed send packets and envelope ticks.
    float inbox = band(r, 0.72, 0.02);
    float nurture = band(r, 0.84, 0.024);
    float loyalty = band(r, 0.95, 0.018);
    float pA = packet(a, 0.095, 0.0, 125.0);
    float pB = packet(1.0 - a, 0.073, 0.2, 125.0);
    float pC = packet(a, 0.055, 0.45, 125.0);
    float env = ticks(a + 0.15, 8.0, 0.01) * (inbox + nurture + loyalty);
    float gate = dashes(a, 16.0, 0.7);
    color += c1 * inbox * (0.5 + pA * 1.4) + c2 * nurture * (0.45 + pB * 1.5)
           + c3 * loyalty * (0.4 + pC * 1.3) + hot * env * 0.35;
    alpha += (inbox + nurture + loyalty) * gate * 0.4 + inbox * pA * 0.7
           + nurture * pB * 0.7 + loyalty * pC * 0.6 + env * 0.2;
  } else if (uMode == 7) {
    // Paid ads: auction lanes, retargeting arcs and conversion crosshairs.
    float auction = band(r, 0.72, 0.022);
    float retarget = band(r, 0.86, 0.018);
    float roas = band(r, 0.96, 0.02);
    float bid = packet(a, 0.13, 0.0, 140.0);
    float again = packet(1.0 - a, 0.1, 0.36, 130.0);
    float convert = ticks(a - uTime * 0.04, 7.0, 0.012);
    float cross = 1.0 - smoothstep(0.01, 0.026, min(abs(fract(a * 4.0) - 0.5), abs(r - 0.84)));
    color += c1 * auction * (0.55 + bid * 1.7) + c2 * retarget * (0.5 + again * 1.5)
           + c3 * roas * (0.4 + convert * 1.3) + hot * cross * 0.6;
    alpha += (auction + retarget + roas) * dashes(a, 28.0, 0.58) * 0.5 + auction * bid * 0.8
           + retarget * again * 0.7 + roas * convert * 0.6 + cross * 0.28;
  } else if (uMode == 6) {
    // SEO: a climbing rank ladder and keyword satellites.
    float rank = band(r, 0.78, 0.024);
    float authority = band(r, 0.93, 0.018);
    float steps = ticks(a + r * 0.18, 10.0, 0.018);
    float keywords = ticks(a, 9.0, 0.012) * authority;
    float crawl = packet(a, 0.085, 0.0, 105.0);
    float backlink = packet(1.0 - a, 0.055, 0.18, 110.0);
    color += c1 * rank * (0.45 + crawl * 1.35) + c2 * rank * steps * 0.8
           + c3 * keywords * (0.4 + backlink * 1.45) + hot * authority * backlink * 1.1;
    alpha += rank * 0.4 + rank * steps * 0.35 + keywords * 0.5 + rank * crawl * 0.65
           + authority * backlink * 0.65;
  } else if (uMode == 5) {
    // Web development: component routes with deploy packets and bracket ticks.
    float rA = band(r, 0.7, 0.02);
    float rB = band(r, 0.84, 0.024);
    float rC = band(r, 0.96, 0.018);
    float dA = packet(a, 0.105, 0.0, 120.0);
    float dB = packet(1.0 - a, 0.082, 0.32, 120.0);
    float dC = packet(a, 0.06, 0.58, 120.0);
    float brackets = ticks(a, 14.0, 0.012) * (rA + rB + rC);
    color += c1 * rA * (0.5 + dA * 1.5) + c2 * rB * (0.45 + dB * 1.45)
           + c3 * rC * (0.4 + dC * 1.3) + hot * brackets * 0.32;
    alpha += (rA + rB + rC) * dashes(a, 22.0, 0.72) * 0.48 + rA * dA * 0.7
           + rB * dB * 0.65 + rC * dC * 0.6 + brackets * 0.22;
  } else if (uMode == 4) {
    // UI/UX: wireframe halos with usability checkpoints.
    float wA = band(r, 0.72, 0.024);
    float wB = band(r, 0.88, 0.018);
    float nodes = ticks(a, 12.0, 0.012) * (wA + wB);
    float focus = packet(a, 0.075, 0.0, 100.0);
    float proto = packet(1.0 - a, 0.052, 0.32, 115.0);
    color += c1 * wA * (0.5 + focus * 1.4) + c3 * wB * (0.5 + proto * 1.35) + hot * nodes * 0.45;
    alpha += (wA + wB) * dashes(a, 20.0, 0.66) * 0.5 + wA * focus * 0.65
           + wB * proto * 0.6 + nodes * 0.28;
  } else if (uMode == 3) {
    // Digital marketing: channel bands lit by campaign bursts.
    float social = band(r, 0.72, 0.026);
    float search = band(r, 0.84, 0.022);
    float mail = band(r, 0.95, 0.02);
    float bA = packet(a, 0.115, 0.0, 100.0);
    float bB = packet(a, -0.09, 0.25, 100.0);
    float bC = packet(a, 0.07, 0.55, 100.0);
    float beacon = ticks(a, 6.0, 0.012) * (social + search + mail);
    color += c1 * social * (0.55 + bA * 1.55) + c2 * search * (0.5 + bB * 1.45)
           + c3 * mail * (0.45 + bC * 1.35) + hot * beacon * 0.3;
    alpha += (social + search + mail) * dashes(a, 18.0, 0.7) * 0.4 + social * bA * 0.75
           + search * bB * 0.68 + mail * bC * 0.6 + beacon * 0.2;
  } else if (uMode == 2) {
    // Cloud: an orbital station ring. Hull modules with lit windows, solar
    // arrays catching the core and a rollout pulse running round the hub.
    float hull = band(r, 0.82, 0.03);
    float seam = 1.0 - smoothstep(0.0, 0.01, abs(fract(a * 36.0) - 0.5) - 0.47);
    float arrays = band(r, 0.93, 0.025) * step(0.5, fract(a * 12.0)) * (1.0 - band(r, 0.93, 0.004));
    float windows = band(r, 0.82, 0.006) * step(0.5, fract(a * 180.0))
                  * step(0.35, hash31(vec3(floor(a * 36.0), 1.0, 2.0)));
    float pulse = packet(a, 0.1, 0.0, 130.0) * hull;
    vec3 metal = mix(vec3(0.5, 0.52, 0.56), c3, 0.3);
    color += metal * hull * (1.0 - seam * 0.6) * (0.25 + shadow * 0.6)
           + c1 * arrays * (0.25 + shadow * 0.55)
           + hot * windows * 1.4 + c3 * pulse * 1.6;
    alpha += hull * 0.8 + arrays * 0.55 + windows * 0.6 + pulse * 0.6;
  } else if (uMode == 1) {
    // Mobile: twin release tracks with pulses heading opposite ways.
    float iosBand = band(r, 0.74, 0.022);
    float androidBand = band(r, 0.9, 0.022);
    float iosPulse = packet(a, 0.12, 0.0, 120.0);
    float androidPulse = packet(1.0 - a, 0.105, 0.0, 120.0);
    float nodes = ticks(a, 8.0, 0.01) * (iosBand + androidBand);
    color += c1 * iosBand * (0.6 + iosPulse * 1.8) + c3 * androidBand * (0.55 + androidPulse * 1.75)
           + hot * nodes * 0.38;
    alpha += (iosBand + androidBand) * dashes(a, 24.0, 0.74) * 0.55
           + iosBand * iosPulse * 0.8 + androidBand * androidPulse * 0.8 + nodes * 0.32;
  } else {
    // Smoke ring for planets without a motif.
    vec3 p1 = vec3(r * 3.5, angle * 2.0, uTime * 0.12);
    float n1 = fbm(p1);
    float shape = smoothstep(0.65, 0.75, r) * (1.0 - smoothstep(0.92, 1.0, r));
    color += mix(c1, c3, n1) * shape;
    alpha += shape * (0.5 + smoothstep(0.25, 0.75, n1) * 0.4);
  }

  gl_FragColor = vec4(color * light, clamp(alpha, 0.0, 1.0));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

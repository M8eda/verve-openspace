import { NOISE_GLSL } from "./noise";

export const ringVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vLocal;

void main() {
  vUv = uv;
  vLocal = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform float uTime;
uniform int uMode;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vLocal;

${NOISE_GLSL}

void main() {
  float r = distance(vUv, vec2(0.5)) * 2.0;
  if (r < 0.65 || r > 1.0) discard;

  vec2 centered = vUv - vec2(0.5);
  float angle = atan(centered.y, centered.x);
  float a = angle / 6.2831853 + 0.5;
  float light = max(dot(normalize(vNormalW), uLightDir), 0.25);

  if (uMode == 8) {
    // Email automation ring: looping lifecycle lanes with timed send packets.
    float segment = fract(a * 16.0);
    float laneGate = smoothstep(0.04, 0.14, segment) * (1.0 - smoothstep(0.70, 0.90, segment));
    float inboxLane = 1.0 - smoothstep(0.020, 0.046, abs(r - 0.72));
    float nurtureLane = 1.0 - smoothstep(0.024, 0.052, abs(r - 0.84));
    float loyaltyLane = 1.0 - smoothstep(0.018, 0.044, abs(r - 0.95));

    float packetA = exp(-pow(fract(a - uTime * 0.095) - 0.5, 2.0) * 125.0);
    float packetB = exp(-pow(fract(1.0 - a - uTime * 0.073 + 0.20) - 0.5, 2.0) * 125.0);
    float packetC = exp(-pow(fract(a - uTime * 0.055 + 0.45) - 0.5, 2.0) * 125.0);
    float envelopeTicks = 1.0 - smoothstep(0.010, 0.026, abs(fract(a * 8.0 + 0.15) - 0.5));
    float fold = (1.0 - smoothstep(0.028, 0.062, abs(fract(a * 8.0) - 0.24)))
               * smoothstep(0.75, 0.82, r) * (1.0 - smoothstep(0.86, 0.93, r));

    vec3 teal = vec3(0.15, 0.88, 0.80);
    vec3 pink = vec3(1.0, 0.33, 0.72);
    vec3 paper = vec3(0.84, 1.0, 0.95);
    vec3 amber = vec3(1.0, 0.72, 0.24);

    vec3 color = teal * inboxLane * (0.54 + packetA * 1.45)
               + pink * nurtureLane * (0.48 + packetB * 1.55)
               + amber * loyaltyLane * (0.42 + packetC * 1.35)
               + paper * envelopeTicks * (inboxLane + nurtureLane + loyaltyLane) * 0.36
               + paper * fold * 0.42;
    float alpha = clamp((inboxLane + nurtureLane + loyaltyLane) * laneGate * 0.50
                      + inboxLane * packetA * 0.72
                      + nurtureLane * packetB * 0.74
                      + loyaltyLane * packetC * 0.66
                      + envelopeTicks * 0.26
                      + fold * 0.20, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 7) {
    // Paid ads ring: auction lanes, retargeting arcs and hot conversion beacons.
    float auctionLane = 1.0 - smoothstep(0.022, 0.050, abs(r - 0.72));
    float retargetLane = 1.0 - smoothstep(0.018, 0.044, abs(r - 0.86));
    float roasLane = 1.0 - smoothstep(0.020, 0.048, abs(r - 0.96));
    float dashes = smoothstep(0.06, 0.18, fract(a * 28.0)) * (1.0 - smoothstep(0.58, 0.84, fract(a * 28.0)));

    float bidPulse = exp(-pow(fract(a - uTime * 0.13) - 0.5, 2.0) * 140.0);
    float retargetPulse = exp(-pow(fract(1.0 - a - uTime * 0.10 + 0.36) - 0.5, 2.0) * 130.0);
    float conversion = 1.0 - smoothstep(0.012, 0.032, abs(fract(a * 7.0 - uTime * 0.04) - 0.5));
    float crosshair = 1.0 - smoothstep(0.010, 0.026, min(abs(fract(a * 4.0) - 0.5), abs(r - 0.84)));

    vec3 red = vec3(1.0, 0.16, 0.32);
    vec3 gold = vec3(1.0, 0.76, 0.24);
    vec3 mint = vec3(0.44, 1.0, 0.58);
    vec3 rose = vec3(1.0, 0.58, 0.70);

    vec3 color = red * auctionLane * (0.58 + bidPulse * 1.70)
               + gold * retargetLane * (0.50 + retargetPulse * 1.50)
               + mint * roasLane * (0.44 + conversion * 1.30)
               + rose * crosshair * 0.62;
    float alpha = clamp((auctionLane + retargetLane + roasLane) * dashes * 0.56
                      + auctionLane * bidPulse * 0.82
                      + retargetLane * retargetPulse * 0.74
                      + roasLane * conversion * 0.60
                      + crosshair * 0.28, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 6) {
    // SEO ring: climbing rank ladder, keyword satellites and search-scan pulses.
    float rankLane = 1.0 - smoothstep(0.024, 0.052, abs(r - 0.78));
    float authorityLane = 1.0 - smoothstep(0.018, 0.045, abs(r - 0.93));
    float steps = 1.0 - smoothstep(0.018, 0.046, abs(fract(a * 10.0 + r * 1.8) - 0.5));
    float keywordNodes = 1.0 - smoothstep(0.012, 0.030, abs(fract(a * 9.0) - 0.5));
    float crawlerPulse = exp(-pow(fract(a - uTime * 0.085) - 0.5, 2.0) * 105.0);
    float backlinkPulse = exp(-pow(fract(1.0 - a - uTime * 0.055 + 0.18) - 0.5, 2.0) * 110.0);

    float ladder = rankLane * steps;
    float satellites = authorityLane * keywordNodes;
    vec3 serpGreen = vec3(0.30, 1.0, 0.54);
    vec3 gold = vec3(0.96, 0.88, 0.32);
    vec3 mint = vec3(0.78, 1.0, 0.86);

    vec3 color = serpGreen * rankLane * (0.48 + crawlerPulse * 1.35)
               + gold * ladder * 0.84
               + mint * satellites * (0.42 + backlinkPulse * 1.45)
               + gold * authorityLane * backlinkPulse * 1.20;
    float alpha = clamp(rankLane * 0.46 + ladder * 0.38 + satellites * 0.55
                      + rankLane * crawlerPulse * 0.68
                      + authorityLane * backlinkPulse * 0.70, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 5) {
    // Web development ring: component orbit lines with deploy packets and browser ticks.
    float routeA = 1.0 - smoothstep(0.020, 0.046, abs(r - 0.70));
    float routeB = 1.0 - smoothstep(0.024, 0.052, abs(r - 0.84));
    float routeC = 1.0 - smoothstep(0.018, 0.043, abs(r - 0.96));
    float brackets = 1.0 - smoothstep(0.012, 0.030, abs(fract(a * 14.0) - 0.5));
    float codeGaps = smoothstep(0.05, 0.16, fract(a * 22.0)) * (1.0 - smoothstep(0.72, 0.90, fract(a * 22.0)));

    float deployA = exp(-pow(fract(a - uTime * 0.105) - 0.5, 2.0) * 120.0);
    float deployB = exp(-pow(fract(1.0 - a - uTime * 0.082 + 0.32) - 0.5, 2.0) * 120.0);
    float deployC = exp(-pow(fract(a - uTime * 0.060 + 0.58) - 0.5, 2.0) * 120.0);

    vec3 cyan = vec3(0.00, 0.94, 1.0);
    vec3 magenta = vec3(1.0, 0.22, 0.76);
    vec3 lime = vec3(0.55, 1.0, 0.34);
    vec3 ice = vec3(0.82, 0.96, 1.0);

    vec3 color = cyan * routeA * (0.54 + deployA * 1.50)
               + magenta * routeB * (0.46 + deployB * 1.45)
               + lime * routeC * (0.42 + deployC * 1.28)
               + ice * brackets * (routeA + routeB + routeC) * 0.34;
    float alpha = clamp((routeA + routeB + routeC) * codeGaps * 0.52
                      + routeA * deployA * 0.72
                      + routeB * deployB * 0.68
                      + routeC * deployC * 0.60
                      + brackets * 0.24, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 4) {
    // UI/UX ring: focus halos, wireframe tracks and usability checkpoints.
    float wireA = 1.0 - smoothstep(0.024, 0.052, abs(r - 0.72));
    float wireB = 1.0 - smoothstep(0.018, 0.044, abs(r - 0.88));
    float usabilityNodes = 1.0 - smoothstep(0.012, 0.030, abs(fract(a * 12.0) - 0.5));
    float focusSweep = exp(-pow(fract(a - uTime * 0.075) - 0.5, 2.0) * 100.0);
    float prototypeSweep = exp(-pow(fract(1.0 - a - uTime * 0.052 + 0.32) - 0.5, 2.0) * 115.0);
    float wireDashes = smoothstep(0.05, 0.17, fract(a * 20.0)) * (1.0 - smoothstep(0.66, 0.88, fract(a * 20.0)));

    float bridge = (1.0 - smoothstep(0.030, 0.064, abs(fract(a * 6.0 + 0.25) - 0.5)))
                 * smoothstep(0.73, 0.80, r) * (1.0 - smoothstep(0.82, 0.90, r));
    vec3 gold = vec3(1.0, 0.82, 0.12);
    vec3 focusBlue = vec3(0.25, 0.80, 1.0);
    vec3 passGreen = vec3(0.62, 1.0, 0.36);
    vec3 cream = vec3(1.0, 0.96, 0.70);

    vec3 color = gold * wireA * (0.52 + focusSweep * 1.40)
               + focusBlue * wireB * (0.52 + prototypeSweep * 1.35)
               + passGreen * usabilityNodes * (wireA + wireB) * 0.48
               + cream * bridge * 0.42;
    float alpha = clamp((wireA + wireB) * wireDashes * 0.58
                      + wireA * focusSweep * 0.68
                      + wireB * prototypeSweep * 0.62
                      + usabilityNodes * (wireA + wireB) * 0.30
                      + bridge * 0.22, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 3) {
    // Digital marketing ring: separated channel bands with campaign broadcast bursts.
    float socialBand = 1.0 - smoothstep(0.026, 0.055, abs(r - 0.72));
    float searchBand = 1.0 - smoothstep(0.022, 0.050, abs(r - 0.84));
    float emailBand = 1.0 - smoothstep(0.020, 0.046, abs(r - 0.95));
    float channelGaps = smoothstep(0.06, 0.16, fract(a * 18.0)) * (1.0 - smoothstep(0.70, 0.90, fract(a * 18.0)));

    float burstA = exp(-pow(fract(a - uTime * 0.115) - 0.5, 2.0) * 100.0);
    float burstB = exp(-pow(fract(a + uTime * 0.090 + 0.25) - 0.5, 2.0) * 100.0);
    float burstC = exp(-pow(fract(a - uTime * 0.070 + 0.55) - 0.5, 2.0) * 100.0);
    float beacon = 1.0 - smoothstep(0.012, 0.032, abs(fract(a * 6.0) - 0.5));

    vec3 orange = vec3(1.0, 0.43, 0.06);
    vec3 magenta = vec3(1.0, 0.14, 0.78);
    vec3 violet = vec3(0.56, 0.34, 1.0);

    vec3 color = orange * socialBand * (0.58 + burstA * 1.55)
               + magenta * searchBand * (0.52 + burstB * 1.45)
               + violet * emailBand * (0.46 + burstC * 1.35)
               + vec3(1.0, 0.78, 0.42) * beacon * (socialBand + searchBand + emailBand) * 0.30;
    float alpha = clamp((socialBand + searchBand + emailBand) * channelGaps * 0.42
                      + socialBand * burstA * 0.75
                      + searchBand * burstB * 0.68
                      + emailBand * burstC * 0.62
                      + beacon * 0.22, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 2) {
    // DevOps CI/CD ring: segmented build/test/deploy stages with rollout pulses.
    float band = 1.0 - smoothstep(0.028, 0.055, abs(r - 0.82));
    float seg = fract(a * 12.0);
    float segmentOn = smoothstep(0.05, 0.15, seg) * (1.0 - smoothstep(0.76, 0.92, seg));
    float stageNode = 1.0 - smoothstep(0.012, 0.030, abs(fract(a * 6.0) - 0.5));
    float pulse = exp(-pow(fract(a - uTime * 0.10) - 0.5, 2.0) * 130.0);
    float outerScan = 1.0 - smoothstep(0.020, 0.050, abs(r - 0.94));
    outerScan *= exp(-pow(fract(1.0 - a - uTime * 0.075) - 0.5, 2.0) * 110.0);

    vec3 build = vec3(0.12, 0.74, 1.0);
    vec3 test = vec3(0.42, 1.0, 0.54);
    vec3 deploy = vec3(0.70, 0.62, 1.0);
    vec3 stageColor = mix(build, test, step(0.34, fract(a * 3.0)));
    stageColor = mix(stageColor, deploy, step(0.67, fract(a * 3.0)));

    vec3 color = stageColor * band * segmentOn * (0.70 + pulse * 1.60)
               + vec3(0.86, 1.0, 0.94) * stageNode * band * 0.55
               + build * outerScan * 1.4;
    float alpha = clamp(band * segmentOn * 0.62 + pulse * band * 0.75 + stageNode * band * 0.36 + outerScan * 0.65, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else if (uMode == 1) {
    // Cross-platform twin tracks: iOS blue and Android green release pulses.
    float iosBand = 1.0 - smoothstep(0.022, 0.048, abs(r - 0.74));
    float androidBand = 1.0 - smoothstep(0.022, 0.048, abs(r - 0.90));
    float gapPattern = smoothstep(0.06, 0.16, fract(a * 24.0)) * (1.0 - smoothstep(0.74, 0.90, fract(a * 24.0)));

    float iosPulse = exp(-pow(fract(a - uTime * 0.12) - 0.5, 2.0) * 120.0);
    float androidPulse = exp(-pow(fract(1.0 - a - uTime * 0.105) - 0.5, 2.0) * 120.0);
    float stageNode = 1.0 - smoothstep(0.010, 0.028, abs(fract(a * 8.0) - 0.5));

    vec3 iosColor = vec3(0.25, 0.62, 1.0);
    vec3 androidColor = vec3(0.45, 1.0, 0.36);
    vec3 bridgeColor = vec3(0.88, 0.80, 1.0);

    float bridge = (1.0 - smoothstep(0.035, 0.070, abs(fract(a * 4.0 + 0.20) - 0.5)))
                 * smoothstep(0.72, 0.80, r) * (1.0 - smoothstep(0.84, 0.92, r));
    float rings = (iosBand + androidBand) * gapPattern;
    float pulseGlow = iosBand * iosPulse + androidBand * androidPulse;
    float nodes = (iosBand + androidBand) * stageNode;

    vec3 color = iosColor * iosBand * (0.60 + iosPulse * 1.8)
               + androidColor * androidBand * (0.58 + androidPulse * 1.75)
               + bridgeColor * bridge * 0.65
               + vec3(1.0) * nodes * 0.38;
    float alpha = clamp(rings * 0.58 + pulseGlow * 0.82 + bridge * 0.26 + nodes * 0.34, 0.0, 1.0);
    gl_FragColor = vec4(color * light, alpha);
  } else {
    // Polar coordinates for coherent smoke flow
    vec3 p1 = vec3(r * 3.5, angle * 2.0, uTime * 0.12);
    vec3 p2 = vec3(r * 7.0, angle * 4.0, uTime * 0.25);

    float n1 = fbm(p1);
    float n2 = fbm(p2);

    // Turbulent opacity map
    float turbulence = smoothstep(0.25, 0.75, n1 * 1.2 + n2 * 0.4 - 0.3);

    // Radial masking with soft edges (shape)
    float shape = smoothstep(0.65, 0.75, r) * (1.0 - smoothstep(0.92, 1.0, r));

    // Dynamic color variation based on noise
    vec3 colorShift = mix(uColor, uColor * 1.4 + 0.1, n1 * 0.5);

    float alpha = shape * (0.72 + turbulence * 0.55);
    gl_FragColor = vec4(colorShift * light, alpha);
  }

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

import { NOISE_GLSL } from "./noise";

/**
 * The Verve core: an animated, granulated green star.
 *
 * The effect borrows the reference sun's layered construction: a noisy emissive
 * sphere, a camera-facing corona, and procedural ribbon geometry for rays/flares.
 * Everything stays brand-green and procedural so no texture assets are required.
 */
export const coreVertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vNormalW;
varying vec3 vViewPos;

void main() {
  vLocal = normalize(position);
  vNormalV = normalize(normalMatrix * normal);
  vNormalW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const coreFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uHot;
uniform float uIntensity;

varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vNormalW;
varying vec3 vViewPos;

${NOISE_GLSL}

mat2 coreRot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float layeredPlasma(vec3 n) {
  vec3 a = n;
  vec3 b = n;
  vec3 c = n;

  a.yz = coreRot(uTime * 0.11) * a.yz;
  b.zx = coreRot(uTime * -0.085 + 2.2) * b.zx;
  c.xy = coreRot(uTime * 0.065 - 1.4) * c.xy;

  float broad = fbm(a * 2.15 + vec3(0.0, uTime * 0.045, 0.0));
  float cells = vnoise(b * 8.5 + broad * 2.8 + vec3(uTime * 0.08, 0.0, -uTime * 0.05));
  float granules = vnoise(c * 24.0 + cells * 1.6 + vec3(-uTime * 0.11, uTime * 0.04, uTime * 0.07));

  float veins = abs(sin((b.x + b.y * 0.8 + b.z * 0.6 + broad * 1.7) * 12.0));
  veins = pow(1.0 - veins, 3.0) * 0.35;

  return clamp(broad * 0.48 + cells * 0.34 + granules * 0.18 + veins, 0.0, 1.0);
}

void main() {
  vec3 n = normalize(vLocal);
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(vViewPos);
  float facing = clamp(dot(N, V), 0.0, 1.0);

  float plasma = layeredPlasma(n);
  float hotCells = smoothstep(0.50, 0.94, plasma);
  float darkerLanes = smoothstep(0.15, 0.48, plasma);

  vec3 col = mix(uDeep, uMid, darkerLanes);
  col = mix(col, uHot, hotCells);

  float roundness = mix(0.52, 1.0, sqrt(facing));
  float microPulse = 0.94 + 0.06 * sin(uTime * 1.7 + plasma * 8.0);
  vec3 emission = col * mix(1.05, 2.55, hotCells) * roundness * microPulse * uIntensity;

  float limb = pow(1.0 - facing, 2.15);
  emission += uMid * limb * 1.85 * uIntensity;
  emission += uHot * pow(limb, 4.0) * 0.8 * uIntensity;

  gl_FragColor = vec4(emission, 1.0);
}
`;

export const coreHaloVertex = /* glsl */ `
uniform float uHalf;
varying vec2 vP;

void main() {
  vP = (uv - 0.5) * 2.0 * uHalf;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const coreHaloFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uGlow;
uniform float uStrength;
uniform float uHalf;
varying vec2 vP;

void main() {
  float r = length(vP);
  float outside = max(r - 1.0, 0.0);
  float angle = atan(vP.y, vP.x);

  float rim = exp(-pow((r - 1.0) / 0.055, 2.0));
  float nearCorona = exp(-outside * 3.1) * 0.34;
  float longCorona = exp(-outside * 0.78) * 0.075;
  float unevenEdge = 0.72 + 0.28 * sin(angle * 9.0 + uTime * 0.45)
                   + 0.16 * sin(angle * 17.0 - uTime * 0.32);
  float plume = pow(max(unevenEdge, 0.0), 2.0) * exp(-outside * 1.55) * 0.06;

  float outsideOnly = smoothstep(0.78, 1.02, r);
  float fade = 1.0 - smoothstep(uHalf * 0.62, uHalf, r);
  float alpha = (rim * 0.58 + nearCorona + longCorona + plume) * outsideOnly * fade * uStrength;

  vec3 color = uGlow * alpha * 2.9 + mix(uGlow, vec3(1.0), 0.22) * rim * 0.8 * uStrength;
  gl_FragColor = vec4(color, alpha);
}
`;

export const coreRibbonVertex = /* glsl */ `
attribute vec3 aRibbon;
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aRandom;

uniform float uTime;
uniform float uWidth;
uniform float uLength;
uniform float uLift;
uniform float uRadial;
uniform float uNoiseFrequency;
uniform float uNoiseAmplitude;
uniform float uLoopProfile;
uniform float uOpacity;

varying float vAcross;
varying float vOpacity;
varying float vHeat;
varying float vFacing;

#define PI 3.141592653589793

vec3 solarCurl(vec3 p, float t) {
  vec3 q = p;
  q += 0.34 * vec3(
    sin(p.y * 1.7 + p.z * 0.9 + t),
    sin(p.z * 1.5 - p.x * 0.7 - t * 0.8),
    sin(p.x * 1.3 + p.y * 0.8 + t * 0.65)
  );
  q += 0.18 * vec3(
    sin(q.z * 2.6 + t * 1.3),
    sin(q.x * 2.2 - t * 1.1),
    sin(q.y * 2.4 + t * 0.9)
  );
  return q - p;
}

vec3 ribbonPosition(float phase) {
  float radius = length(aStart);
  vec3 base = mix(aStart, aEnd, phase);
  vec3 normalDir = normalize(base);
  float arch = sin(phase * PI);
  float reach = phase * uLength * radius * (0.55 + aRandom.z * 0.8);

  base += normalDir * (reach * uRadial + arch * uLift * radius * (0.45 + aRandom.w));
  base += solarCurl(normalDir * uNoiseFrequency + aRandom.xyz * 9.0, uTime * 0.72)
        * uNoiseAmplitude * radius * (0.25 + arch);

  return base;
}

void main() {
  float phase = aRibbon.x;
  vAcross = aRibbon.z;

  float burst = fract(uTime * (0.055 + aRandom.y * 0.12) + aRandom.x);
  float life = smoothstep(0.0, 0.18, burst) * (1.0 - smoothstep(0.68, 1.0, burst));
  float arch = sin(phase * PI);
  float tail = mix(1.0 - phase, arch, uLoopProfile);

  vec3 pObj = ribbonPosition(phase);
  vec3 pNextObj = ribbonPosition(min(phase + 0.025, 1.0));

  vec3 pWorld = (modelMatrix * vec4(pObj, 1.0)).xyz;
  vec3 pNextWorld = (modelMatrix * vec4(pNextObj, 1.0)).xyz;

  vec3 dirWorld = normalize(pNextWorld - pWorld);
  vec3 viewWorld = normalize(pWorld - cameraPosition);
  vec3 sideWorld = normalize(cross(viewWorld, dirWorld));
  if (length(sideWorld) < 0.001) {
    sideWorld = normalize(cross(vec3(0.0, 1.0, 0.0), dirWorld));
  }

  float worldScale = length((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  float width = uWidth * length(aStart) * worldScale * (0.28 + tail) * (0.7 + aRandom.w);
  pWorld += sideWorld * width * aRibbon.z;

  vec3 normalWorld = normalize((modelMatrix * vec4(normalize(pObj), 0.0)).xyz);
  vFacing = dot(normalWorld, normalize(cameraPosition - pWorld));
  vOpacity = uOpacity * life * smoothstep(0.0, 0.09, phase) * (1.0 - smoothstep(0.92, 1.0, phase));
  vHeat = clamp(tail * 0.72 + aRandom.z * 0.28, 0.0, 1.0);

  gl_Position = projectionMatrix * viewMatrix * vec4(pWorld, 1.0);
}
`;

export const coreRibbonFragment = /* glsl */ `
precision highp float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;

varying float vAcross;
varying float vOpacity;
varying float vHeat;
varying float vFacing;

void main() {
  float edge = 1.0 - smoothstep(0.0, 1.0, abs(vAcross));
  edge *= edge;
  float front = smoothstep(-0.10, 0.34, vFacing);
  float alpha = clamp(edge * vOpacity * front, 0.0, 1.0);

  vec3 color = mix(uColorA, uColorB, smoothstep(0.08, 0.95, vHeat));
  color += uColorB * pow(edge, 4.0) * 0.35;

  gl_FragColor = vec4(color * alpha * uIntensity, alpha);
}
`;

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { services } from "@/data/services";
import { getPlanetPosition } from "@/lib/planetPositions";
import { isWeakGPU } from "@/lib/device";

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICE = services.find((s) => s.slug === "branding-strategy")!;
const RADIUS = 0.9;
const OUTER_RING_RADIUS = RADIUS * 1.28;
const INNER_RING_RADIUS = RADIUS * 1.11;
const LIME_GREEN = "#cdf757";
const STAR_BLUE = "#7dd3fc";

const atlasVertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vLocal = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const atlasFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uLightDir;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float circleMask(vec2 p, vec2 center, float radius, float soft) {
  return 1.0 - smoothstep(radius, radius + soft, distance(p, center));
}

float segmentMask(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(width, width * 2.4, length(pa - ba * h));
}

float gridLine(float value, float cells, float width) {
  return 1.0 - smoothstep(width, width * 2.6, abs(fract(value * cells) - 0.5));
}

void main() {
  vec3 n = normalize(vLocal);
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);

  float theta = acos(clamp(n.y, -1.0, 1.0));
  float phi = atan(n.z, n.x);
  float uCoord = phi / 6.2831853 + 0.5;
  float vCoord = theta / 3.14159265;

  vec3 voidInk = vec3(0.004, 0.004, 0.018);
  vec3 deepViolet = vec3(0.034, 0.020, 0.090);
  vec3 chartBlue = vec3(0.075, 0.180, 0.270);
  vec3 lime = vec3(0.804, 0.969, 0.341);
  vec3 cyan = vec3(0.490, 0.827, 0.988);
  vec3 starlight = vec3(0.960, 0.985, 0.920);
  vec3 magenta = vec3(0.640, 0.380, 1.000);

  float rawLight = dot(N, normalize(uLightDir));
  float diffuse = pow(max(rawLight, 0.0), 0.82);
  float terminator = smoothstep(-0.24, 0.82, rawLight);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.05);
  float chartLight = diffuse * 0.52 + rim * 0.42 + 0.24;

  float nebula = sin((uCoord * 2.7 + vCoord * 3.8) * 6.2831853 + sin(uCoord * 9.0) * 0.6) * 0.5 + 0.5;
  vec3 color = mix(voidInk, deepViolet, smoothstep(-0.82, 0.86, n.y));
  color = mix(color, chartBlue, nebula * 0.14);
  color *= 0.50 + terminator * 0.62;

  // Faint star-chart coordinates: latitude, longitude, and strategic sector lines.
  float latitude = gridLine(vCoord, 9.0, 0.006);
  float longitude = gridLine(uCoord + sin(vCoord * 6.2831853) * 0.006, 18.0, 0.005);
  float equator = 1.0 - smoothstep(0.003, 0.013, abs(vCoord - 0.5));
  float meridian = 1.0 - smoothstep(0.003, 0.013, abs(fract(uCoord + 0.125) - 0.5));
  float sectorGrid = max(max(latitude * 0.30, longitude * 0.28), max(equator, meridian) * 0.86);
  color += cyan * sectorGrid * 0.22 * chartLight;
  color += lime * max(equator, meridian) * 0.18 * chartLight;

  // Background market stars: tiny, numerous, and procedural so the map feels celestial.
  #if QUALITY_TIER == 0
  vec2 starGrid = vec2(uCoord, vCoord) * vec2(26.0, 13.0);
  #else
  vec2 starGrid = vec2(uCoord, vCoord) * vec2(42.0, 21.0);
  #endif
  vec2 starId = floor(starGrid);
  vec2 starF = fract(starGrid);
  float starRand = hash21(starId + 17.0);
  vec2 starPoint = vec2(0.18 + hash21(starId + 2.1) * 0.64, 0.18 + hash21(starId + 8.4) * 0.64);
  float microStar = circleMask(starF, starPoint, 0.018, 0.014) * step(0.84, starRand);
  float microTwinkle = 0.72 + 0.28 * sin(uTime * 1.6 + starRand * 12.0);
  color += mix(cyan, starlight, starRand) * microStar * microTwinkle * 0.42 * chartLight;

  // Constellation cells: audience, market, competitors, and position connected into a map.
  #if QUALITY_TIER == 0
  vec2 atlasGrid = vec2(uCoord, vCoord) * vec2(5.5, 3.2);
  #else
  vec2 atlasGrid = vec2(uCoord, vCoord) * vec2(7.2, 4.2);
  #endif
  vec2 cellId = floor(atlasGrid);
  vec2 cellF = fract(atlasGrid);
  float cellRand = hash21(cellId + 2.7);
  float constellationOn = step(0.48, cellRand);
  vec2 audience = vec2(0.18 + hash21(cellId + 1.1) * 0.24, 0.24 + hash21(cellId + 4.8) * 0.48);
  vec2 market = vec2(0.42 + hash21(cellId + 7.5) * 0.22, 0.18 + hash21(cellId + 3.2) * 0.62);
  vec2 competitor = vec2(0.68 + hash21(cellId + 8.8) * 0.16, 0.28 + hash21(cellId + 6.3) * 0.46);
  vec2 position = vec2(0.46 + hash21(cellId + 11.2) * 0.22, 0.62 + hash21(cellId + 14.6) * 0.20);
  float links = segmentMask(cellF, audience, market, 0.0045)
              + segmentMask(cellF, market, competitor, 0.0045)
              + segmentMask(cellF, market, position, 0.0045)
              + segmentMask(cellF, audience, position, 0.0035);
  float audienceNode = circleMask(cellF, audience, 0.024, 0.014);
  float marketNode = circleMask(cellF, market, 0.019, 0.012);
  float competitorNode = circleMask(cellF, competitor, 0.016, 0.010);
  float positionNode = circleMask(cellF, position, 0.030, 0.016);
  float nodeGlow = audienceNode + marketNode + competitorNode + positionNode;
  float activePulse = 0.86 + 0.14 * sin(uTime * 1.15 + cellRand * 8.0);
  color += cyan * links * constellationOn * 0.36 * chartLight;
  color += starlight * (audienceNode + marketNode) * constellationOn * 0.82 * chartLight;
  color += magenta * competitorNode * constellationOn * 0.45 * chartLight;
  color += lime * positionNode * constellationOn * activePulse * 1.15 * chartLight;
  color += lime * nodeGlow * constellationOn * 0.10 * rim;

  // Long-range brand routes wrap around the globe like strategy lines on an astrolabe.
  float routePathA = abs(vCoord - (0.51 + sin((uCoord * 1.65 + uTime * 0.020) * 6.2831853) * 0.052));
  float routePathB = abs(vCoord - (0.30 + sin((uCoord * 1.10 - uTime * 0.017 + 0.35) * 6.2831853) * 0.046));
  float routePathC = abs(vCoord - (0.69 + sin((uCoord * 1.36 + 0.62) * 6.2831853) * 0.035));
  float dashA = smoothstep(0.08, 0.19, fract(uCoord * 30.0)) * (1.0 - smoothstep(0.58, 0.86, fract(uCoord * 30.0)));
  float dashB = smoothstep(0.06, 0.17, fract((1.0 - uCoord) * 24.0 + 0.18)) * (1.0 - smoothstep(0.60, 0.84, fract((1.0 - uCoord) * 24.0 + 0.18)));
  float routeA = (1.0 - smoothstep(0.004, 0.015, routePathA)) * dashA * smoothstep(0.08, 0.20, vCoord) * (1.0 - smoothstep(0.82, 0.94, vCoord));
  float routeB = (1.0 - smoothstep(0.004, 0.014, routePathB)) * dashB * smoothstep(0.08, 0.21, vCoord) * (1.0 - smoothstep(0.66, 0.86, vCoord));
  float routeC = (1.0 - smoothstep(0.003, 0.012, routePathC)) * smoothstep(0.10, 0.24, fract(uCoord * 18.0)) * (1.0 - smoothstep(0.62, 0.88, fract(uCoord * 18.0)));
  float routePulseA = exp(-pow(fract(uCoord - uTime * 0.062) - 0.5, 2.0) * 120.0) * (1.0 - smoothstep(0.004, 0.018, routePathA));
  float routePulseB = exp(-pow(fract(1.0 - uCoord - uTime * 0.048 + 0.28) - 0.5, 2.0) * 125.0) * (1.0 - smoothstep(0.004, 0.016, routePathB));
  color += (lime * routeA * 0.54 + cyan * routeB * 0.40 + magenta * routeC * 0.18) * chartLight;
  color += lime * routePulseA * 1.00 * chartLight + starlight * routePulseB * 0.58 * chartLight;

  // One bright positioning beacon anchors the constellation map without becoming a compass.
  vec3 beaconDir = normalize(vec3(-0.30, 0.62, 0.72));
  float beaconDot = dot(n, beaconDir);
  float beaconHalo = pow(max(beaconDot, 0.0), 32.0);
  float beaconCore = smoothstep(0.992, 0.999, beaconDot);
  float beaconPulse = 0.84 + 0.16 * sin(uTime * 1.35);
  color += lime * beaconHalo * 0.52 * beaconPulse;
  color += starlight * beaconCore * 1.9 * beaconPulse;

  color += lime * rim * 0.34 + cyan * rim * 0.18;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export default function EcosystemPlanet({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const gyroRef = useRef<THREE.Group>(null);
  const gyroOuterRingRef = useRef<THREE.Mesh>(null);
  const gyroInnerRingRef = useRef<THREE.Mesh>(null);
  const stored = getPlanetPosition("branding-strategy");
  const lowPower = useMemo(() => isWeakGPU(), []);
  const shellSegments = lowPower ? 48 : 96;
  const ringTube = lowPower ? 0.012 : 0.017;
  const ringSegments = lowPower ? 80 : 144;

  const { atlasMaterial, gyroRingMaterials } = useMemo(() => {
    const atlasMaterial = new THREE.ShaderMaterial({
      vertexShader: atlasVertex,
      fragmentShader: atlasFragment,
      defines: {
        QUALITY_TIER: lowPower ? 0 : 1,
      },
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.6, 0.9, 0.4).normalize() },
      },
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
    });

    const makeGyroMaterial = (color: string, opacity: number, emissiveIntensity: number) => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      material.userData.baseOpacity = opacity;
      material.userData.baseColor = new THREE.Color(color);
      material.userData.baseEmissive = emissiveIntensity;
      return material;
    };

    const gyroRingMaterials = [
      makeGyroMaterial(LIME_GREEN, lowPower ? 0.30 : 0.42, lowPower ? 0.12 : 0.22),
      makeGyroMaterial(STAR_BLUE, lowPower ? 0.22 : 0.32, lowPower ? 0.08 : 0.16),
    ];

    return { atlasMaterial, gyroRingMaterials };
  }, [lowPower]);

  const lightDir = useRef(new THREE.Vector3());

  const fixedOrbitTime = SERVICE.index * 5.25;

  // ── Orbit animation — mirrors Planet.tsx orbit logic exactly ───────────────
  useFrame(({ clock }, delta) => {
    const t = reduceMotion ? fixedOrbitTime : clock.elapsedTime;
    const dt = reduceMotion ? 0 : delta;
    atlasMaterial.uniforms.uTime.value = t;

    const s = SERVICE;
    const phase = s.index * 1.37;
    const angle = t * s.visual.orbitSpeed * 0.075 + phase;
    const ellipse = 0.74 + (s.index % 3) * 0.08;
    const inclination = Math.sin(s.index * 1.91) * 0.34;
    const x = Math.cos(angle) * s.visual.orbitRadius;
    const flatZ = Math.sin(angle) * s.visual.orbitRadius * ellipse;
    const yBase = Math.sin(angle + phase * 0.5) * s.visual.orbitRadius * 0.1 + Math.sin(s.index * 2.2) * 0.8;
    const z = flatZ * Math.cos(inclination) - yBase * Math.sin(inclination);
    const y = flatZ * Math.sin(inclination) + yBase * Math.cos(inclination);

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      stored.set(x, y, z);

      // Light comes from the direction of the VerveCore (origin).
      lightDir.current.set(-x, -y, -z).normalize();
      atlasMaterial.uniforms.uLightDir.value.copy(lightDir.current);
    }

    // Spin the cartography independently.
    if (spinRef.current) {
      spinRef.current.rotation.y += dt * 0.09;
    }

    const slowPulse = 0.5 + 0.5 * Math.sin(t * 0.85);
    const gyroPulse = lowPower ? 0.88 + slowPulse * 0.05 : 0.94 + slowPulse * 0.06;
    for (const material of gyroRingMaterials) {
      material.opacity = reduceMotion
        ? material.userData.baseOpacity
        : material.opacity * 0.94 + material.userData.baseOpacity * gyroPulse * 0.06;
      material.color
        .copy(material.userData.baseColor as THREE.Color)
        .multiplyScalar(1 + material.userData.baseEmissive * gyroPulse);
    }

    if (gyroRef.current) {
      gyroRef.current.rotation.set(
        Math.PI * 0.08 + Math.sin(t * 0.18) * 0.10,
        t * 0.30,
        Math.PI * 0.06 + Math.cos(t * 0.14) * 0.08,
      );
    }
    if (gyroOuterRingRef.current) {
      gyroOuterRingRef.current.rotation.set(Math.PI / 2, 0.0, t * 0.22);
    }
    if (gyroInnerRingRef.current) {
      gyroInnerRingRef.current.rotation.set(Math.PI / 2, Math.PI / 2 + Math.sin(t * 0.28) * 0.10, -t * 0.52);
    }
  });

  useEffect(() => {
    return () => {
      atlasMaterial.dispose();
      for (const material of gyroRingMaterials) material.dispose();
    };
  }, [atlasMaterial, gyroRingMaterials]);

  return (
    <group ref={groupRef}>
      <group ref={spinRef}>
        {/* North-star cartography surface. */}
        <mesh material={atlasMaterial} renderOrder={1}>
          <sphereGeometry args={[RADIUS, shellSegments, shellSegments]} />
        </mesh>
      </group>

      {/* Tight rounded gyroscope rings stay as the navigation/calibration frame. */}
      <group ref={gyroRef} renderOrder={2}>
        <mesh ref={gyroOuterRingRef} material={gyroRingMaterials[0]}>
          <torusGeometry args={[OUTER_RING_RADIUS, ringTube, lowPower ? 8 : 12, ringSegments]} />
        </mesh>
        <mesh ref={gyroInnerRingRef} material={gyroRingMaterials[1]}>
          <torusGeometry args={[INNER_RING_RADIUS, ringTube * 0.86, lowPower ? 8 : 12, ringSegments]} />
        </mesh>
      </group>
    </group>
  );
}

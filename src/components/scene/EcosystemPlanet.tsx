"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { services } from "@/data/services";
import { getPlanetPosition } from "@/lib/planetPositions";
import { isWeakGPU } from "@/lib/device";
import { hexToVec3 } from "@/lib/color";
import { fixedOrbitTime as frozenOrbitTime, orbitAngle, orbitPointAt } from "@/lib/orbit";
import { NOISE_GLSL } from "@/shaders/noise";
import { PLANET_COMMON_GLSL } from "@/shaders/planetCommon";
import Atmosphere from "./Atmosphere";

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICE = services.find((s) => s.slug === "branding-strategy")!;
const RADIUS = 0.9;
const OUTER_RING_RADIUS = RADIUS * 1.28;
const INNER_RING_RADIUS = RADIUS * 1.11;
const PLANET_COLOR = SERVICE.visual.color;
const PLANET_ACCENT = SERVICE.visual.accent;

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

// Icy crystal world: faceted ice lit by the core, a beacon burning at the
// north pole (the brand's north star) and constellation lights joining
// audience, market and position across the night side.
const atlasFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uAccent;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

${NOISE_GLSL}
${PLANET_COMMON_GLSL}

float segmentMask(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(width, width * 2.4, length(pa - ba * h));
}

float node(vec2 p, vec2 c, float r) {
  return 1.0 - smoothstep(r, r * 2.2, distance(p, c));
}

void main() {
  vec3 n = normalize(vLocal);
  vec3 Ng = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLightDir);
  float ndl = dot(Ng, L);
  float night = nightSide(ndl);

  // Crystal facets: flat plates split by glowing fracture seams.
  #if QUALITY_TIER == 0
  float plate = fbm2(n * 3.0);
  float seam = 1.0 - smoothstep(0.0, 0.04, abs(fract(plate * 5.0) - 0.5) - 0.44);
  float facet = fract(plate * 5.0);
  #else
  vec3 cell = voronoi3D(n * 3.2);
  float seam = 1.0 - smoothstep(0.0, 0.035, cell.y);
  float facet = cell.z;
  float plate = cell.x;
  #endif
  float frost = vnoise(n * 22.0);

  vec3 ice = vec3(0.78, 0.82, 0.95);
  vec3 deep = uColor * 0.32;
  vec3 albedo = mix(deep, mix(ice, uAccent, 0.35), 0.35 + facet * 0.45);
  albedo = mix(albedo, ice, smoothstep(0.55, 0.95, abs(n.y)) * 0.6);
  albedo *= 0.85 + frost * 0.2;

  // Each facet tilts its own way, so the core glints off individual plates.
  vec3 tilt = vec3(hash31(vec3(facet * 91.0)), hash31(vec3(facet * 37.0 + 5.0)), hash31(vec3(facet * 13.0 + 9.0))) - 0.5;
  vec3 N = normalize(perturbNormal(Ng, vWorld, (plate * 0.5 - seam * 0.4 + frost * 0.1) * 0.03) + tilt * 0.18);
  vec3 color = litSurface(albedo, N, L, V, ndl, 60.0, 0.45);

  // Light trapped in the ice leaks out of the seams, strongest at night.
  color += mix(uColor, uAccent, 0.4) * seam * (0.05 + night * 0.4);

  // Constellations on the cube faces (no pole pinching).
  float face;
  #if QUALITY_TIER == 0
  vec2 grid = cubeUV(n, face) * 2.0;
  #else
  vec2 grid = cubeUV(n, face) * 3.0;
  #endif
  vec2 id = floor(grid);
  vec2 f = fract(grid);
  float on = step(0.4, hash31(vec3(id, face + 2.7)));
  vec2 audience = vec2(0.2, 0.3) + vec2(hash31(vec3(id, face + 1.1)), hash31(vec3(id, face + 4.8))) * 0.25;
  vec2 market = vec2(0.45, 0.2) + vec2(hash31(vec3(id, face + 7.5)), hash31(vec3(id, face + 3.2))) * 0.3;
  vec2 position = vec2(0.6, 0.6) + vec2(hash31(vec3(id, face + 11.2)), hash31(vec3(id, face + 14.6))) * 0.2;
  float links = segmentMask(f, audience, market, 0.006)
              + segmentMask(f, market, position, 0.006)
              + segmentMask(f, audience, position, 0.005);
  float stars = node(f, audience, 0.018) + node(f, market, 0.015) + node(f, position, 0.024);
  #if QUALITY_TIER == 1
  float twinkle = 0.8 + 0.2 * sin(uTime * 1.4 + hash31(vec3(id, face)) * 12.0);
  #else
  float twinkle = 1.0;
  #endif
  color += on * (uAccent * links * 0.35 + mix(uAccent, vec3(1.0), 0.5) * stars * 1.4 * twinkle) * (night + 0.06);

  // The polar beacon: a hot core with a halo that breathes.
  float pole = n.y;
  #if QUALITY_TIER == 1
  float pulse = 0.8 + 0.2 * sin(uTime * 1.35);
  #else
  float pulse = 0.9;
  #endif
  float halo = pow(max(pole, 0.0), 60.0);
  float core = smoothstep(0.994, 0.999, pole);
  float beam = (1.0 - smoothstep(0.0, 0.015, abs(fract((pole - uTime * 0.02) * 30.0) - 0.5) - 0.48))
             * smoothstep(0.85, 0.97, pole) * (1.0 - core);
  color += uColor * halo * 1.4 * pulse + mix(uAccent, vec3(1.0), 0.6) * core * 3.0 * pulse;
  color += uAccent * beam * 0.25;

  color += atmosphereGlow(Ng, V, ndl, mix(uColor, uAccent, 0.5), 0.9);

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

  const { atlasMaterial, gyroRingMaterials, beaconMaterial, beamMaterial } = useMemo(() => {
    const atlasMaterial = new THREE.ShaderMaterial({
      vertexShader: atlasVertex,
      fragmentShader: atlasFragment,
      defines: {
        QUALITY_TIER: lowPower ? 0 : 1,
      },
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.6, 0.9, 0.4).normalize() },
        uColor: { value: hexToVec3(PLANET_COLOR) },
        uAccent: { value: hexToVec3(PLANET_ACCENT) },
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
      makeGyroMaterial(PLANET_COLOR, lowPower ? 0.30 : 0.42, lowPower ? 0.12 : 0.22),
      makeGyroMaterial(PLANET_ACCENT, lowPower ? 0.22 : 0.32, lowPower ? 0.08 : 0.16),
    ];

    // The beacon burns above the bloom threshold so it reads at any distance.
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PLANET_ACCENT).multiplyScalar(3),
      toneMapped: false,
    });
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PLANET_COLOR).multiplyScalar(1.6),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    return { atlasMaterial, gyroRingMaterials, beaconMaterial, beamMaterial };
  }, [lowPower]);

  const lightDir = useRef(new THREE.Vector3());

  const fixedOrbitTime = frozenOrbitTime(SERVICE);

  // ── Orbit animation — mirrors Planet.tsx orbit logic exactly ───────────────
  useFrame(({ clock }, delta) => {
    const t = reduceMotion ? fixedOrbitTime : clock.elapsedTime;
    const dt = reduceMotion ? 0 : delta;
    atlasMaterial.uniforms.uTime.value = t;

    orbitPointAt(SERVICE, orbitAngle(SERVICE, t), stored);

    if (groupRef.current) {
      groupRef.current.position.copy(stored);

      // Light comes from the direction of the VerveCore (origin).
      lightDir.current.copy(stored).negate().normalize();
      atlasMaterial.uniforms.uLightDir.value.copy(lightDir.current);
    }

    // Spin the cartography independently.
    if (spinRef.current) {
      spinRef.current.rotation.y += dt * 0.09;
    }

    const beaconPulse = reduceMotion ? 0.9 : 0.8 + 0.2 * Math.sin(t * 1.35);
    beamMaterial.opacity = 0.35 * beaconPulse;

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
      beaconMaterial.dispose();
      beamMaterial.dispose();
    };
  }, [atlasMaterial, gyroRingMaterials, beaconMaterial, beamMaterial]);

  return (
    <group ref={groupRef}>
      <group ref={spinRef}>
        {/* Icy crystal surface with the north-star beacon at the pole. */}
        <mesh material={atlasMaterial} renderOrder={1}>
          <sphereGeometry args={[RADIUS, shellSegments, shellSegments]} />
        </mesh>
        {/* Polar beacon: the brand's north star, with a beam pointing out. */}
        <mesh material={beaconMaterial} position={[0, RADIUS * 1.01, 0]}>
          <sphereGeometry args={[RADIUS * 0.035, 12, 8]} />
        </mesh>
        <mesh material={beamMaterial} position={[0, RADIUS * 1.2, 0]}>
          <cylinderGeometry args={[RADIUS * 0.003, RADIUS * 0.02, RADIUS * 0.36, 10, 1, true]} />
        </mesh>
      </group>
      <Atmosphere radius={RADIUS} color={PLANET_COLOR} strength={0.7} segments={lowPower ? 32 : 64} />

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

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hexToVec3 } from "@/lib/color";
import { getPlanetPosition } from "@/lib/planetPositions";
import { fixedOrbitTime as frozenOrbitTime, orbitAngle, orbitPointAt } from "@/lib/orbit";
import { isWeakGPU } from "@/lib/device";
import { moonFragment, planetFragment, planetVertex } from "@/shaders/planet";
import { ringFragment, ringVertex } from "@/shaders/ring";
import Atmosphere from "./Atmosphere";
import type { Service } from "@/data/services";

const SURFACE_INDEX: Record<Service["visual"]["surface"], number> = {
  rocky: 0,
  banded: 1,
  cloudy: 2,
  crystalline: 3,
  metallic: 4,
  oceanic: 5,
  volcanic: 6,
  glass: 7,
  accessible: 8,
  performance: 9,
  mobile: 10,
  seo: 11,
  marketing: 12,
  ads: 13,
  email: 14,
  cloud: 15,
};

const RING_MODE: Record<Service["visual"]["surface"], number> = {
  rocky: 0,
  banded: 0,
  cloudy: 0,
  crystalline: 0,
  metallic: 0,
  oceanic: 0,
  volcanic: 0,
  glass: 0,
  accessible: 4,
  performance: 5,
  mobile: 1,
  seo: 6,
  marketing: 3,
  ads: 7,
  email: 8,
  cloud: 2,
};

/** Haze strength per look: gas and cloud worlds glow, rock barely does. */
const ATMOSPHERE: Partial<Record<Service["visual"]["surface"], number>> = {
  accessible: 1.1,
  performance: 0.35,
  mobile: 0.6,
  seo: 0.8,
  marketing: 1.0,
  ads: 0.55,
  email: 1.0,
  cloud: 1.25,
};

/** Companions orbiting a planet: Mobile's two moons, Email's satellites. */
type Companion = {
  kind: "moon" | "satellite";
  size: number;
  distance: number;
  speed: number;
  tilt: number;
  phase: number;
};

const COMPANIONS: Partial<Record<Service["visual"]["surface"], Companion[]>> = {
  mobile: [
    { kind: "moon", size: 0.16, distance: 1.95, speed: 0.32, tilt: 0.35, phase: 0 },
    { kind: "moon", size: 0.1, distance: 2.4, speed: -0.21, tilt: -0.5, phase: 2.4 },
  ],
  email: [
    { kind: "satellite", size: 0.045, distance: 1.85, speed: 0.55, tilt: 0.9, phase: 0 },
    { kind: "satellite", size: 0.045, distance: 1.95, speed: -0.42, tilt: -0.6, phase: 2.1 },
    { kind: "satellite", size: 0.045, distance: 2.1, speed: 0.36, tilt: 0.2, phase: 4.2 },
  ],
};

export default function Planet({
  service,
  reduceMotion = false,
}: {
  service: Service;
  reduceMotion?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const companionRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { visual } = service;
  const stored = getPlanetPosition(service.slug);
  const weak = useMemo(() => isWeakGPU(), []);
  const companions = COMPANIONS[visual.surface] ?? [];

  const fixedOrbitTime = frozenOrbitTime(service);

  const { planetMat, ringMat, moonMat, satelliteMat } = useMemo(() => {
    const planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
      defines: {
        QUALITY_TIER: weak ? 0 : 1,
        SURFACE_MODE: SURFACE_INDEX[visual.surface],
      },
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: visual.planetRadius },
        uColor: { value: hexToVec3(visual.color) },
        uAccent: { value: hexToVec3(visual.accent) },
        uLightDir: { value: new THREE.Vector3(0, 0, 1) },
      },
    });

    const ringMat = new THREE.ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      uniforms: {
        uColor: { value: hexToVec3(visual.color) },
        uAccent: { value: hexToVec3(visual.accent) },
        uLightDir: { value: new THREE.Vector3(0, 0, 1) },
        uPlanetCenter: { value: new THREE.Vector3() },
        uPlanetRadius: { value: visual.planetRadius },
        uTime: { value: 0 },
        uMode: { value: RING_MODE[visual.surface] },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const moonMat = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: moonFragment,
      uniforms: {
        uLightDir: { value: new THREE.Vector3(0, 0, 1) },
        uTint: { value: hexToVec3(visual.accent) },
        uRadius: { value: visual.planetRadius * 0.16 },
      },
    });

    // Pushed past the bloom threshold so the satellites read as beacons.
    const satelliteMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(visual.accent),
      toneMapped: false,
    });
    satelliteMat.userData.base = new THREE.Color(visual.accent);

    return { planetMat, ringMat, moonMat, satelliteMat };
  }, [visual.color, visual.accent, visual.surface, visual.planetRadius, weak]);

  useEffect(
    () => () => {
      planetMat.dispose();
      ringMat.dispose();
      moonMat.dispose();
      satelliteMat.dispose();
    },
    [planetMat, ringMat, moonMat, satelliteMat],
  );

  const lightDir = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const t = reduceMotion ? fixedOrbitTime : clock.elapsedTime;
    const phase = service.index * 1.37;
    orbitPointAt(service, orbitAngle(service, t), stored);

    if (groupRef.current) {
      groupRef.current.position.copy(stored);

      lightDir.current.copy(stored).multiplyScalar(-1).normalize();
      planetMat.uniforms.uLightDir.value.copy(lightDir.current);
      planetMat.uniforms.uTime.value = t;
      ringMat.uniforms.uLightDir.value.copy(lightDir.current);
      ringMat.uniforms.uPlanetCenter.value.copy(stored);
      ringMat.uniforms.uTime.value = t;
      moonMat.uniforms.uLightDir.value.copy(lightDir.current);
    }

    if (spinRef.current) {
      spinRef.current.rotation.set(
        Math.sin(phase) * 0.18,
        t * (0.09 + service.index * 0.012),
        Math.cos(phase) * 0.12,
      );
    }

    companions.forEach((c, i) => {
      const mesh = companionRefs.current[i];
      if (!mesh) return;
      const a = t * c.speed + c.phase;
      const d = visual.planetRadius * c.distance;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      mesh.position.set(x, z * Math.sin(c.tilt), z * Math.cos(c.tilt));
      mesh.rotation.set(t * 0.4, t * 0.7, 0);
    });

    if (companions.length && visual.surface === "email") {
      const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3.2);
      satelliteMat.color.copy(satelliteMat.userData.base as THREE.Color).multiplyScalar(1.2 + pulse * 2.4);
    }
  });

  const segs = weak ? 48 : 96;

  return (
    <group ref={groupRef}>
      <group ref={spinRef}>
        <mesh material={planetMat}>
          <sphereGeometry args={[visual.planetRadius, segs, segs / 2]} />
        </mesh>
        <mesh material={ringMat} rotation={[Math.PI / 2.4, 0, service.index]}>
          <planeGeometry args={[visual.planetRadius * 3.3, visual.planetRadius * 3.3]} />
        </mesh>
      </group>
      <Atmosphere
        radius={visual.planetRadius}
        color={visual.surface === "cloud" ? visual.accent : visual.color}
        strength={ATMOSPHERE[visual.surface] ?? 0.8}
        segments={weak ? 32 : 64}
      />
      {companions.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            companionRefs.current[i] = m;
          }}
          material={c.kind === "moon" ? moonMat : satelliteMat}
        >
          {c.kind === "moon" ? (
            <sphereGeometry args={[visual.planetRadius * c.size, 24, 16]} />
          ) : (
            <octahedronGeometry args={[visual.planetRadius * c.size, 0]} />
          )}
        </mesh>
      ))}
    </group>
  );
}

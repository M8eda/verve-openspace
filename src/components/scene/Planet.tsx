"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hexToVec3 } from "@/lib/color";
import { getPlanetPosition } from "@/lib/planetPositions";
import { isWeakGPU } from "@/lib/device";
import { planetFragment, planetVertex } from "@/shaders/planet";
import { ringFragment, ringVertex } from "@/shaders/ring";
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

export default function Planet({
  service,
  reduceMotion = false,
}: {
  service: Service;
  reduceMotion?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { visual } = service;
  const stored = getPlanetPosition(service.slug);

  const fixedOrbitTime = service.index * 5.25;

  const { planetMat, ringMat } = useMemo(() => {
    const planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
      defines: {
        QUALITY_TIER: isWeakGPU() ? 0 : 1,
        SURFACE_MODE: SURFACE_INDEX[visual.surface],
      },
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: hexToVec3(visual.color) },
        uAccent: { value: hexToVec3(visual.accent) },
        uLightDir: { value: new THREE.Vector3(0, 0, 1) },
      },
    });

    const ringMat = new THREE.ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      uniforms: {
        uColor: { value: hexToVec3(visual.accent) },
        uLightDir: { value: new THREE.Vector3(0, 0, 1) },
        uTime: { value: 0 },
        uMode: { value: RING_MODE[visual.surface] },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    return { planetMat, ringMat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visual.color, visual.accent, visual.surface]);

  useEffect(
    () => () => {
      planetMat.dispose();
      ringMat?.dispose();
    },
    [planetMat, ringMat],
  );

  const lightDir = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const t = reduceMotion ? fixedOrbitTime : clock.elapsedTime;
    const phase = service.index * 1.37;
    const angle = t * visual.orbitSpeed * 0.075 + phase;
    const ellipse = 0.74 + (service.index % 3) * 0.08;
    const inclination = Math.sin(service.index * 1.91) * 0.34;
    const x = Math.cos(angle) * visual.orbitRadius;
    const flatZ = Math.sin(angle) * visual.orbitRadius * ellipse;
    const y = Math.sin(angle + phase * 0.5) * visual.orbitRadius * 0.1 + Math.sin(service.index * 2.2) * 0.8;
    const z = flatZ * Math.cos(inclination) - y * Math.sin(inclination);
    const tiltedY = flatZ * Math.sin(inclination) + y * Math.cos(inclination);

    if (groupRef.current) {
      groupRef.current.position.set(x, tiltedY, z);
      stored.set(x, tiltedY, z);

      lightDir.current.copy(stored).multiplyScalar(-1).normalize();
      planetMat.uniforms.uLightDir.value.copy(lightDir.current);
      planetMat.uniforms.uTime.value = t;
      if (ringMat) {
        ringMat.uniforms.uLightDir.value.copy(lightDir.current);
        ringMat.uniforms.uTime.value = t;
      }

      groupRef.current.rotation.set(
        Math.sin(phase) * 0.18,
        t * (0.09 + service.index * 0.012),
        Math.cos(phase) * 0.12,
      );
    }
  });

  const segs = 64;
  const ringSegs = 64;

  return (
    <group ref={groupRef}>
      <mesh material={planetMat}>
        <sphereGeometry args={[visual.planetRadius, segs, ringSegs]} />
      </mesh>
      <mesh material={ringMat} rotation={[Math.PI / 2.4, 0, service.index]}>
        <planeGeometry args={[visual.planetRadius * 3.3, visual.planetRadius * 3.3]} />
      </mesh>
    </group>
  );
}

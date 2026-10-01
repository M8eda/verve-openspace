"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hexToVec3 } from "@/lib/color";
import { atmosphereFragment, atmosphereVertex } from "@/shaders/atmosphere";

/** How far the haze reaches past the surface, as a fraction of the radius. */
const SHELL = 1.12;

/**
 * Soft atmosphere halo around a planet, lit from the core at the origin.
 * Place it as a child of the planet's (unscaled) group.
 */
export default function Atmosphere({
  radius,
  color,
  strength = 1,
  segments = 48,
}: {
  radius: number;
  color: string;
  strength?: number;
  segments?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useRef(new THREE.Vector3());

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uTint: { value: hexToVec3(color) },
          uLightDir: { value: new THREE.Vector3(0, 0, 1) },
          uPlanetRadius: { value: radius },
          uAtmoRadius: { value: radius * SHELL },
          uStrength: { value: strength },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color, radius, strength],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.getWorldPosition(world.current);
    material.uniforms.uLightDir.value.copy(world.current).negate().normalize();
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={3}>
      <sphereGeometry args={[radius * SHELL, segments, segments / 2]} />
    </mesh>
  );
}

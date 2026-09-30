"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { hazeFragment, hazeVertex, type HazeQuality } from "@/shaders/haze";
import { isWeakGPU } from "@/lib/device";

function pickHazeQuality(): HazeQuality {
  return isWeakGPU() ? "cheap" : "full";
}

/** Huge inside-out sphere that paints the faint nebula behind everything. */
export default function Haze() {
  const quality = useMemo(() => pickHazeQuality(), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: hazeVertex,
        fragmentShader: hazeFragment(quality),
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [quality],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[700, 48, 24]} />
    </mesh>
  );
}

"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { hazeBakedFragment, hazeFragment, hazeVertex, type HazeQuality } from "@/shaders/haze";
import { isWeakGPU } from "@/lib/device";

const HAZE_RADIUS = 700;

/**
 * Cube face size for the baked haze. At 512 the bilinear lookup stays within
 * a few hundredths of one 8-bit colour step of the live shader, even on 4K.
 */
const BAKE_SIZE = 512;

function pickHazeQuality(): HazeQuality {
  return isWeakGPU() ? "cheap" : "full";
}

/** Half-float targets keep the near-black tones from banding. */
function canBake(gl: THREE.WebGLRenderer): boolean {
  return gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
}

/** Renders the procedural haze, seen from the sphere's centre, into a cube map. */
function bakeHaze(gl: THREE.WebGLRenderer, target: THREE.WebGLCubeRenderTarget, quality: HazeQuality) {
  const geometry = new THREE.SphereGeometry(HAZE_RADIUS, 48, 24);
  const material = new THREE.ShaderMaterial({
    vertexShader: hazeVertex,
    fragmentShader: hazeFragment(quality),
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  new THREE.CubeCamera(1, HAZE_RADIUS * 2, target).update(gl, scene);
  geometry.dispose();
  material.dispose();
}

/**
 * Huge inside-out sphere that paints the faint nebula behind everything.
 * The noise has no time input and only depends on direction, so it's baked
 * once and each frame just samples it.
 */
export default function Haze() {
  const gl = useThree((s) => s.gl);
  const quality = useMemo(() => pickHazeQuality(), []);

  const target = useMemo(
    () =>
      canBake(gl)
        ? new THREE.WebGLCubeRenderTarget(BAKE_SIZE, { type: THREE.HalfFloatType, depthBuffer: false })
        : null,
    [gl],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: hazeVertex,
        fragmentShader: target ? hazeBakedFragment : hazeFragment(quality),
        uniforms: target ? { uHaze: { value: target.texture } } : {},
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [quality, target],
  );

  // Layout effect so the bake lands before the first frame is drawn.
  useLayoutEffect(() => {
    if (!target) return;
    const bake = () => bakeHaze(gl, target, quality);
    bake();

    // A lost context takes the baked pixels with it; three brings the
    // target back empty, so paint it again.
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextrestored", bake);
    return () => {
      canvas.removeEventListener("webglcontextrestored", bake);
      target.dispose();
    };
  }, [gl, target, quality]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[HAZE_RADIUS, 48, 24]} />
    </mesh>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CORE_RADIUS, GLOW_HALF } from "@/lib/constants";
import { isWeakGPU } from "@/lib/device";
import {
  coreFragment,
  coreHaloFragment,
  coreHaloVertex,
  coreRibbonFragment,
  coreRibbonVertex,
  coreVertex,
} from "@/shaders/core";
import { pagerPosition, PAGE_COUNT } from "@/lib/journeyPager";
import { finale } from "@/lib/finale";

const ARRIVAL_WINDOW = 1.2;

type RibbonGeometryConfig = {
  count: number;
  segments: number;
  radius: number;
  loops: boolean;
};

function randomUnitVector(target: THREE.Vector3) {
  const z = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return target.set(r * Math.cos(theta), r * Math.sin(theta), z);
}

function createCoreRibbonGeometry({ count, segments, radius, loops }: RibbonGeometryConfig) {
  const vertsPerStep = 2;
  const totalVerts = count * segments * vertsPerStep;
  const aRibbon = new Float32Array(totalVerts * 3);
  const aStart = new Float32Array(totalVerts * 3);
  const aEnd = new Float32Array(totalVerts * 3);
  const aRandom = new Float32Array(totalVerts * 4);
  const indices = new Uint32Array(count * (segments - 1) * 6);

  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const jitter = new THREE.Vector3();
  const cluster = new THREE.Vector3();

  let ribbonOffset = 0;
  let startOffset = 0;
  let endOffset = 0;
  let randomOffset = 0;
  let indexOffset = 0;

  randomUnitVector(cluster);

  for (let i = 0; i < count; i++) {
    if (i === 0 || Math.random() < (loops ? 0.035 : 0.1)) {
      randomUnitVector(cluster);
    }

    start.copy(cluster);
    randomUnitVector(jitter).multiplyScalar(loops ? 0.025 : 0.055);
    start.add(jitter).normalize();

    if (loops) {
      end.copy(start);
      randomUnitVector(jitter).multiplyScalar(0.42 + Math.random() * 0.28);
      end.add(jitter).normalize();
    } else {
      end.copy(start);
    }

    const randoms = [Math.random(), Math.random(), Math.random(), Math.random()];

    for (let j = 0; j < segments; j++) {
      const baseIndex = 2 * (i * segments + j);
      const phase = (j + 0.5) / segments;

      for (let side = 0; side < 2; side++) {
        aRibbon[ribbonOffset++] = phase;
        aRibbon[ribbonOffset++] = (i + 0.5) / count;
        aRibbon[ribbonOffset++] = side * 2 - 1;

        aStart[startOffset++] = start.x * radius;
        aStart[startOffset++] = start.y * radius;
        aStart[startOffset++] = start.z * radius;

        aEnd[endOffset++] = end.x * radius;
        aEnd[endOffset++] = end.y * radius;
        aEnd[endOffset++] = end.z * radius;

        for (let k = 0; k < 4; k++) {
          aRandom[randomOffset++] = randoms[k];
        }
      }

      if (j < segments - 1) {
        indices[indexOffset++] = baseIndex;
        indices[indexOffset++] = baseIndex + 1;
        indices[indexOffset++] = baseIndex + 2;
        indices[indexOffset++] = baseIndex + 2;
        indices[indexOffset++] = baseIndex + 1;
        indices[indexOffset++] = baseIndex + 3;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("aRibbon", new THREE.BufferAttribute(aRibbon, 3));
  geometry.setAttribute("aStart", new THREE.BufferAttribute(aStart, 3));
  geometry.setAttribute("aEnd", new THREE.BufferAttribute(aEnd, 3));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(aRandom, 4));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export default function VerveCore({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const weakTier = useMemo(() => isWeakGPU(), []);

  const coreMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Vector3(0.03, 0.12, 0.015) },
        uMid: { value: new THREE.Vector3(0.55, 0.92, 0.18) },
        uHot: { value: new THREE.Vector3(0.94, 1.0, 0.68) },
        uIntensity: { value: 1.0 },
      },
    });
  }, []);

  const haloMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coreHaloVertex,
      fragmentShader: coreHaloFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uGlow: { value: new THREE.Vector3(0.63, 0.94, 0.22) },
        uStrength: { value: 1.0 },
        uHalf: { value: GLOW_HALF },
      },
    });
  }, []);

  const raysGeometry = useMemo(
    () =>
      createCoreRibbonGeometry({
        count: weakTier ? 420 : 1100,
        segments: weakTier ? 4 : 6,
        radius: CORE_RADIUS * 1.01,
        loops: false,
      }),
    [weakTier],
  );

  const flaresGeometry = useMemo(
    () =>
      createCoreRibbonGeometry({
        count: weakTier ? 220 : 620,
        segments: weakTier ? 7 : 10,
        radius: CORE_RADIUS * 1.015,
        loops: true,
      }),
    [weakTier],
  );

  const raysMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coreRibbonVertex,
      fragmentShader: coreRibbonFragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uWidth: { value: weakTier ? 0.020 : 0.014 },
        uLength: { value: 0.62 },
        uLift: { value: 0.03 },
        uRadial: { value: 1.0 },
        uNoiseFrequency: { value: 8.0 },
        uNoiseAmplitude: { value: 0.22 },
        uLoopProfile: { value: 0.0 },
        uOpacity: { value: weakTier ? 0.10 : 0.075 },
        uColorA: { value: new THREE.Vector3(0.35, 0.9, 0.13) },
        uColorB: { value: new THREE.Vector3(0.88, 1.0, 0.55) },
        uIntensity: { value: 1.0 },
      },
    });
  }, [weakTier]);

  const flaresMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coreRibbonVertex,
      fragmentShader: coreRibbonFragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uWidth: { value: weakTier ? 0.014 : 0.008 },
        uLength: { value: 0.10 },
        uLift: { value: 0.30 },
        uRadial: { value: 0.18 },
        uNoiseFrequency: { value: 5.0 },
        uNoiseAmplitude: { value: 0.16 },
        uLoopProfile: { value: 1.0 },
        uOpacity: { value: weakTier ? 0.22 : 0.16 },
        uColorA: { value: new THREE.Vector3(0.23, 0.82, 0.09) },
        uColorB: { value: new THREE.Vector3(0.98, 1.0, 0.66) },
        uIntensity: { value: 1.0 },
      },
    });
  }, [weakTier]);

  const groupRef = useRef<THREE.Group>(null);
  const arrival = useRef(0);

  useFrame(({ clock }, delta) => {
    const time = reduceMotion ? 0 : clock.elapsedTime;
    const dt = reduceMotion ? 0 : delta;
    coreMat.uniforms.uTime.value = time;
    haloMat.uniforms.uTime.value = time;
    raysMat.uniforms.uTime.value = time;
    flaresMat.uniforms.uTime.value = time;

    const coreArrivalParam = PAGE_COUNT - 1;
    const t = THREE.MathUtils.clamp(
      1 - Math.abs(coreArrivalParam - pagerPosition()) / ARRIVAL_WINDOW,
      0,
      1,
    );
    const target = t * t * (3 - 2 * t);
    arrival.current = reduceMotion
      ? target
      : THREE.MathUtils.damp(arrival.current, target, 3, Math.min(dt, 0.05));

    // The finale's docking pulse (CoreFinale) rides on top of the arrival.
    const pulse = finale.pulse;
    const intensity = 1.0 + arrival.current * 0.28 + pulse * 0.45;
    coreMat.uniforms.uIntensity.value = intensity;
    haloMat.uniforms.uStrength.value = 0.72 + arrival.current * 0.42 + pulse * 0.6;
    raysMat.uniforms.uIntensity.value = 0.8 + arrival.current * 0.35 + pulse * 0.5;
    flaresMat.uniforms.uIntensity.value = 0.85 + arrival.current * 0.42 + pulse * 0.5;

    if (groupRef.current) {
      const s = 1 + arrival.current * 0.18 + pulse * 0.06;
      groupRef.current.scale.setScalar(s);
      groupRef.current.rotation.y += dt * 0.025;
    }
  });

  useEffect(
    () => () => {
      coreMat.dispose();
      haloMat.dispose();
      raysMat.dispose();
      flaresMat.dispose();
      raysGeometry.dispose();
      flaresGeometry.dispose();
    },
    [coreMat, flaresGeometry, flaresMat, haloMat, raysGeometry, raysMat],
  );

  const coreSegs = weakTier ? 72 : 128;
  const coreRings = weakTier ? 48 : 96;

  return (
    <group ref={groupRef}>
      <mesh material={coreMat} renderOrder={0}>
        <sphereGeometry args={[CORE_RADIUS, coreSegs, coreRings]} />
      </mesh>

      <mesh geometry={flaresGeometry} material={flaresMat} renderOrder={1} frustumCulled={false} />
      <mesh geometry={raysGeometry} material={raysMat} renderOrder={2} frustumCulled={false} />

      <Billboard follow lockX={false} lockY={false} lockZ={false} renderOrder={3}>
        <mesh material={haloMat}>
          <planeGeometry args={[CORE_RADIUS * GLOW_HALF * 2, CORE_RADIUS * GLOW_HALF * 2, 1, 1]} />
        </mesh>
      </Billboard>
    </group>
  );
}

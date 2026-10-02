"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/random";
import { starsFragment, starsVertex } from "@/shaders/stars";

type Vec3 = [number, number, number];

type Cluster = {
  direction: Vec3;
  radius: number;
  spread: number;
  depth: number;
  color: Vec3;
  accent: Vec3;
};

type StarClustersProps = {
  count: number;
  heroCount: number;
  seed: number;
  reduceMotion?: boolean;
};

const CLUSTERS: Cluster[] = [
  {
    direction: [-0.78, 0.32, -0.54],
    radius: 245,
    spread: 28,
    depth: 34,
    color: [0.2, 0.88, 1.0],
    accent: [0.95, 0.38, 1.0],
  },
  {
    direction: [0.62, 0.22, -0.75],
    radius: 210,
    spread: 22,
    depth: 28,
    color: [0.74, 0.42, 1.0],
    accent: [0.25, 0.82, 1.0],
  },
  {
    direction: [-0.28, -0.42, 0.86],
    radius: 180,
    spread: 18,
    depth: 24,
    color: [1.0, 0.45, 0.82],
    accent: [1.0, 0.68, 0.28],
  },
  {
    direction: [0.18, 0.74, 0.64],
    radius: 275,
    spread: 32,
    depth: 40,
    color: [0.48, 0.98, 0.92],
    accent: [0.84, 0.92, 1.0],
  },
];

function normalize([x, y, z]: Vec3): THREE.Vector3 {
  return new THREE.Vector3(x, y, z).normalize();
}

function mixColor(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  ];
}

function writeVec3(target: Float32Array, index: number, value: THREE.Vector3 | Vec3) {
  const offset = index * 3;
  if (Array.isArray(value)) {
    target[offset] = value[0];
    target[offset + 1] = value[1];
    target[offset + 2] = value[2];
    return;
  }
  target[offset] = value.x;
  target[offset + 1] = value.y;
  target[offset + 2] = value.z;
}

function clusteredPoint(cluster: Cluster, rand: () => number) {
  const direction = normalize(cluster.direction);
  const pole = Math.abs(direction.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3().crossVectors(direction, pole).normalize();
  const bitangent = new THREE.Vector3().crossVectors(direction, tangent).normalize();

  const angle = rand() * Math.PI * 2;
  const drift = cluster.spread * Math.pow(rand(), 0.55);
  const depth = (rand() - 0.5) * cluster.depth;

  return direction
    .multiplyScalar(cluster.radius + depth)
    .addScaledVector(tangent, Math.cos(angle) * drift)
    .addScaledVector(bitangent, Math.sin(angle) * drift);
}

function buildGeometry({ count, heroCount, seed }: StarClustersProps) {
  const rand = mulberry32(seed);
  const total = count + heroCount;

  const position = new Float32Array(total * 3);
  const size = new Float32Array(total);
  const bright = new Float32Array(total);
  const tint = new Float32Array(total * 3);
  const phase = new Float32Array(total);
  const rate = new Float32Array(total);
  const flare = new Float32Array(total);

  for (let i = 0; i < count; i++) {
    const cluster = CLUSTERS[Math.floor(rand() * CLUSTERS.length)];
    const coreBias = Math.pow(rand(), 1.9);
    const isSpark = rand() < 0.045;
    const color = mixColor(cluster.color, cluster.accent, rand() * 0.45);
    const softened = mixColor(color, [1, 1, 1], isSpark ? 0.28 : 0.08 + coreBias * 0.18);

    writeVec3(position, i, clusteredPoint(cluster, rand));
    writeVec3(tint, i, softened);

    size[i] = isSpark ? 2.4 + rand() * 2.1 : 0.85 + rand() * 2.0;
    bright[i] = isSpark ? 0.95 + rand() * 0.42 : 0.22 + Math.pow(rand(), 1.35) * 0.82;
    flare[i] = isSpark ? 16 + rand() * 28 : rand() < 0.07 ? 5 + rand() * 9 : 0;
    phase[i] = rand() * Math.PI * 2;
    rate[i] = 0.25 + rand() * 1.25;
  }

  for (let i = count; i < total; i++) {
    const cluster = CLUSTERS[Math.floor(rand() * CLUSTERS.length)];
    const point = clusteredPoint({ ...cluster, spread: cluster.spread * 1.28, depth: cluster.depth * 1.3 }, rand);
    const color = mixColor(cluster.accent, [1, 1, 1], 0.18 + rand() * 0.28);

    writeVec3(position, i, point);
    writeVec3(tint, i, color);

    size[i] = 3.2 + rand() * 2.9;
    bright[i] = 1.05 + rand() * 0.45;
    flare[i] = 30 + rand() * 36;
    phase[i] = rand() * Math.PI * 2;
    rate[i] = 0.18 + rand() * 0.9;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
  geometry.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aRate", new THREE.BufferAttribute(rate, 1));
  geometry.setAttribute("aFlare", new THREE.BufferAttribute(flare, 1));
  return geometry;
}

export default function StarClusters({ count, heroCount, seed, reduceMotion = false }: StarClustersProps) {
  const { geometry, material } = useMemo(() => {
    const geometry = buildGeometry({ count, heroCount, seed });
    const material = new THREE.ShaderMaterial({
      vertexShader: starsVertex,
      fragmentShader: starsFragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uAttenuate: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geometry, material };
  }, [count, heroCount, seed]);

  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

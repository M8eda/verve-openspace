"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/random";
import { starsFragment, starsVertex } from "@/shaders/stars";

type StarfieldProps = {
  count: number;
  /** Inner and outer radius of the region the stars fill (around the origin). */
  minR: number;
  maxR: number;
  seed: number;
  /** Near layers scale with distance and fade when the camera passes them. */
  attenuate?: boolean;
  /** Fraction of stars that get a diffraction spike. */
  flareChance?: number;
  /** Core diameter range in CSS pixels. */
  sizeRange?: [number, number];
  reduceMotion?: boolean;
};

function buildGeometry({
  count,
  minR,
  maxR,
  seed,
  flareChance = 0.03,
  sizeRange = [1.0, 2.6],
}: StarfieldProps) {
  const rand = mulberry32(seed);

  const position = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const bright = new Float32Array(count);
  const tint = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const rate = new Float32Array(count);
  const flare = new Float32Array(count);

  const min3 = minR ** 3;
  const max3 = maxR ** 3;

  for (let i = 0; i < count; i++) {
    // uniform point in a spherical shell
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = Math.cbrt(min3 + (max3 - min3) * rand());
    position[i * 3] = r * s * Math.cos(theta);
    position[i * 3 + 1] = r * u;
    position[i * 3 + 2] = r * s * Math.sin(theta);

    const isFlare = rand() < flareChance;
    const bigness = Math.pow(rand(), 2.2);

    size[i] = isFlare
      ? 2.8 + rand() * 2.4
      : sizeRange[0] + (sizeRange[1] - sizeRange[0]) * Math.pow(rand(), 1.35);
    flare[i] = isFlare ? 18 + rand() * 30 : rand() < 0.08 ? 6 + rand() * 10 : 0;
    bright[i] = isFlare ? 0.95 + rand() * 0.35 : 0.35 + 0.9 * Math.pow(rand(), 1.25);

    // cinematic mix: icy blues, white stars, amber sparks, and rare Verve green
    const t = rand();
    let c: [number, number, number];
    if (t < 0.38) c = [0.78, 0.9, 1.0];
    else if (t < 0.58) c = [1.0, 0.95, 0.82];
    else if (t < 0.75) c = [0.38, 0.78, 1.0];
    else if (t < 0.9) c = [1.0, 0.52, 0.22];
    else c = [0.72, 1.0, 0.36];
    tint.set(c, i * 3);

    phase[i] = rand() * Math.PI * 2;
    rate[i] = 0.4 + rand() * 1.8;
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

export default function Starfield(props: StarfieldProps) {
  const { count, minR, maxR, seed, attenuate = false, flareChance, sizeRange, reduceMotion = false } = props;

  const { geometry, material } = useMemo(() => {
    const geometry = buildGeometry({ count, minR, maxR, seed, flareChance, sizeRange });
    const material = new THREE.ShaderMaterial({
      vertexShader: starsVertex,
      fragmentShader: starsFragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uAttenuate: { value: attenuate ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geometry, material };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, minR, maxR, seed, attenuate]);

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

"use client";

import { useEffect, useMemo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CORE_RADIUS } from "@/lib/constants";
import { coreStrength, finale } from "@/lib/finale";

/** Shockwave duration, seconds. */
const WAVE_S = 1.8;
/** How far the flat wave travels across the orbital plane (outermost ~32). */
const WAVE_REACH = 34;
/** The billboard ring stays close, a halo-sized burst around the core. */
const BURST_REACH = CORE_RADIUS * 6;

const ringVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// A soft ring at radius 1 of the quad, with a faint fill trailing inside it.
// Colour runs past 1.0 so the bloom pass catches it.
const ringFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uWidth;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  float band = exp(-pow((r - 1.0 + 2.0 * uWidth) / uWidth, 2.0));
  float wake = smoothstep(0.35, 1.0, r) * 0.18;
  // Fade out before the quad's edge so it never shows as a hard line.
  float a = uAlpha * (band + wake) * (1.0 - smoothstep(0.9, 1.0, r));
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * (1.0 + band * 1.4), a);
  #include <colorspace_fragment>
}
`;

function ringMaterial(width: number) {
  return new THREE.ShaderMaterial({
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color("#cdf757") },
      uAlpha: { value: 0 },
      uWidth: { value: width },
    },
  });
}

/**
 * The arrival burst at the core: when the terminal's dock command lands, a
 * shockwave rolls out across the orbital plane, a tighter ring bursts around
 * the core, and the core's glow pulses once (VerveCore reads finale.pulse).
 * Plays once per arrival; revisits and reduced motion skip it.
 */
export default function CoreFinale({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const waveRef = useRef<THREE.Mesh>(null);
  const burstRef = useRef<THREE.Group>(null);
  const waveMat = useMemo(() => ringMaterial(0.035), []);
  const burstMat = useMemo(() => ringMaterial(0.12), []);
  /** Seconds since the wave fired; -1 while idle. */
  const age = useRef(-1);
  const fired = useRef(false);

  useEffect(
    () => () => {
      waveMat.dispose();
      burstMat.dispose();
    },
    [waveMat, burstMat],
  );

  useFrame((_state, delta) => {
    if (!finale.docked) fired.current = false;
    if (finale.docked && !fired.current) {
      fired.current = true;
      if (!reduceMotion && !finale.instant) age.current = 0;
    }

    const wave = waveRef.current;
    const burst = burstRef.current;
    if (!wave || !burst) return;

    if (age.current < 0 || coreStrength() <= 0) {
      age.current = -1;
      wave.visible = false;
      burst.visible = false;
      finale.pulse = 0;
      return;
    }

    age.current += Math.min(delta, 0.05);
    const t = age.current / WAVE_S;
    if (t >= 1) {
      age.current = -1;
      wave.visible = false;
      burst.visible = false;
      finale.pulse = 0;
      return;
    }

    // Fast out, easing off as it spreads, fading over the second half.
    const travel = 1 - Math.pow(1 - t, 3);
    const fade = 1 - THREE.MathUtils.smoothstep(t, 0.35, 1);
    wave.visible = true;
    burst.visible = true;
    wave.scale.setScalar(CORE_RADIUS + travel * (WAVE_REACH - CORE_RADIUS));
    burst.scale.setScalar(CORE_RADIUS + Math.min(1, travel * 1.6) * (BURST_REACH - CORE_RADIUS));
    waveMat.uniforms.uAlpha.value = 0.9 * fade;
    burstMat.uniforms.uAlpha.value = 0.7 * (1 - THREE.MathUtils.smoothstep(t, 0.1, 0.6));

    // Glow pulse: a sharp rise, then a slower fall.
    finale.pulse = t < 0.08 ? t / 0.08 : Math.exp(-(t - 0.08) * 4.5);
  });

  return (
    <>
      <mesh ref={waveRef} material={waveMat} rotation-x={-Math.PI / 2} visible={false} frustumCulled={false} renderOrder={4}>
        <planeGeometry args={[2, 2, 1, 1]} />
      </mesh>
      <Billboard ref={burstRef} visible={false} renderOrder={4}>
        <mesh material={burstMat} frustumCulled={false}>
          <planeGeometry args={[2, 2, 1, 1]} />
        </mesh>
      </Billboard>
    </>
  );
}

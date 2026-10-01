"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import CameraRig from "./CameraRig";
import FreeLookControls from "./FreeLookControls";
import OrbitTrails from "./OrbitTrails";
import CoreEmblem from "./CoreEmblem";
import PlanetTags from "./PlanetTags";
import PlanetPicker from "./PlanetPicker";
import Galaxy from "./Galaxy";
import Haze from "./Haze";
import Planet from "./Planet";
import Starfield from "./Starfield";
import VerveCore from "./VerveCore";
import EcosystemPlanet from "./EcosystemPlanet";
import { services } from "@/data/services";
import { isWeakGPU, prefersReducedMotion } from "@/lib/device";

/** Longest the loader waits on shader compilation before we render anyway. */
const WARMUP_TIMEOUT_MS = 4000;

type SceneProps = {
  dpr: [number, number];
  /** Called once every scene shader is compiled and frames can start. */
  onCompiled: () => void;
};

export default function Scene({ dpr, onCompiled }: SceneProps) {
  const isWeak = useMemo(() => isWeakGPU(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const setDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // Set once the frame rate keeps flip-flopping even at the lowest DPR.
  const [struggling, setStruggling] = useState(false);
  const enablePost = !isWeak && !reduceMotion && !struggling;
  // On 2x+ screens every CSS pixel already spans 4+ device pixels, so 4x MSAA
  // edges look the same as the library's 8x default at half the buffer size
  // and resolve cost. Read once: changing it rebuilds the composer.
  const msaaSamples = useMemo(() => (window.devicePixelRatio >= 2 ? 4 : 8), []);

  // Compile every shader behind the loader rather than on the first visible
  // frame. The canvas draws nothing until this settles, so the driver can
  // link programs in parallel without a render forcing it to block.
  useLayoutEffect(() => {
    let cancelled = false;

    // With the composer on, the scene renders into its buffer, which needs
    // a different program variant (no tone mapping, linear output) than the
    // screen does. Compile against a stand-in target so the variants match.
    const target = enablePost ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiled = gl.compileAsync(scene, camera);
    gl.setRenderTarget(previous);
    target?.dispose();

    // A lost context can leave programs that never report ready.
    const timeout = new Promise((resolve) => window.setTimeout(resolve, WARMUP_TIMEOUT_MS));
    Promise.race([compiled, timeout]).then(() => {
      if (!cancelled) onCompiled();
    });

    return () => {
      cancelled = true;
    };
    // Mount-only: later post toggles compile on demand, as before.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scale render resolution with the measured frame rate: start sharp, drop
  // towards the tier's minimum DPR when frames run long, recover when they
  // don't. Never exceed the screen's own pixel ratio.
  const applyFactor = (factor: number) => {
    const top = Math.max(dpr[0], Math.min(window.devicePixelRatio, dpr[1]));
    setDpr(Math.round((dpr[0] + (top - dpr[0]) * factor) * 10) / 10);
  };

  return (
    <>
      <PerformanceMonitor
        factor={1}
        flipflops={3}
        onChange={({ factor }) => applyFactor(factor)}
        onFallback={() => {
          applyFactor(0);
          setStruggling(true);
        }}
      />
      <color attach="background" args={["#010203"]} />
      <Haze />
      <Galaxy reduceMotion={reduceMotion} />

      <Starfield
        count={isWeak || reduceMotion ? 2400 : 5200}
        minR={160}
        maxR={360}
        seed={7}
        flareChance={isWeak || reduceMotion ? 0.03 : 0.055}
        sizeRange={[0.9, 3.1]}
        reduceMotion={reduceMotion}
      />
      <Starfield
        count={isWeak || reduceMotion ? 450 : 900}
        minR={18}
        maxR={120}
        seed={21}
        attenuate
        flareChance={0.045}
        sizeRange={[1.1, 2.8]}
        reduceMotion={reduceMotion}
      />
      <Starfield
        count={isWeak || reduceMotion ? 160 : 320}
        minR={4}
        maxR={36}
        seed={42}
        attenuate
        flareChance={reduceMotion ? 0.02 : 0.08}
        sizeRange={[1.5, 4.2]}
        reduceMotion={reduceMotion}
      />

      {services
        .filter((s) => s.slug !== "branding-strategy")
        .map((s) => (
          <Planet key={s.slug} service={s} reduceMotion={reduceMotion} />
        ))}

      <VerveCore reduceMotion={reduceMotion} />
      <EcosystemPlanet reduceMotion={reduceMotion} />
      <CameraRig />
      <FreeLookControls />
      <OrbitTrails reduceMotion={reduceMotion} />
      <CoreEmblem />
      <PlanetTags />
      <PlanetPicker />

      {enablePost && (
        <EffectComposer enableNormalPass={false} multisampling={msaaSamples}>
          <Bloom
            intensity={0.8}
            luminanceThreshold={1.0}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.75}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}

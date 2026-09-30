"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import CameraRig from "./CameraRig";
import FreeLookControls from "./FreeLookControls";
import PlanetLabels from "./PlanetLabels";
import Galaxy from "./Galaxy";
import Haze from "./Haze";
import Planet from "./Planet";
import Starfield from "./Starfield";
import VerveCore from "./VerveCore";
import EcosystemPlanet from "./EcosystemPlanet";
import { services } from "@/data/services";
import { isWeakGPU, prefersReducedMotion } from "@/lib/device";

export default function Scene() {
  const isWeak = useMemo(() => isWeakGPU(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const enablePost = !isWeak && !reduceMotion;

  useFrame((state, delta) => {
    // Start at 1.0 (max quality).
    // If FPS drops below 45 (delta > 0.022s) for multiple frames,
    // R3F will gradually lower the performance scaling factor towards 'min'.
    if (delta > 0.022) {
      state.performance.regress();
    }
  });

  return (
    <>
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
      <PlanetLabels />

      {enablePost && (
        <EffectComposer enableNormalPass={false}>
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

"use client";

import { useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
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

export default function Scene({ dpr }: { dpr: [number, number] }) {
  const isWeak = useMemo(() => isWeakGPU(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const setDpr = useThree((s) => s.setDpr);
  // Set once the frame rate keeps flip-flopping even at the lowest DPR.
  const [struggling, setStruggling] = useState(false);
  const enablePost = !isWeak && !reduceMotion && !struggling;

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

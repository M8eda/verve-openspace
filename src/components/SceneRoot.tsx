"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SceneFallback from "./SceneFallback";
import { isMobileTier, isWeakGPU, supportsWebGL } from "@/lib/device";
import { sceneReady } from "@/lib/scrollState";
import { cancelPendingFreeMode } from "@/lib/freeMode";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/**
 * The WebGL layer only exists on the home route. Service/core pages don't mount
 * the canvas or fallback, and the heavy R3F scene bundle is fetched only after a
 * route and capability check says it can actually be shown.
 */
export default function SceneRoot() {
  const pathname = usePathname();
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [broken, setBroken] = useState(false);
  const [tier, setTier] = useState<{ mobile: boolean; weak: boolean } | null>(null);
  const sceneActive = pathname === "/";

  useEffect(() => {
    if (!sceneActive) {
      sceneReady.ready = false;
      sceneReady.failed = false;
      setWebglSupported(null);
      setTier(null);
      setBroken(false);
      return;
    }

    const supported = supportsWebGL();
    sceneReady.failed = !supported;
    setWebglSupported(supported);
    setBroken(false);

    if (supported) {
      const mobile = isMobileTier();
      setTier({ mobile, weak: isWeakGPU() });
    } else {
      setTier(null);
    }
  }, [sceneActive]);

  // Tell the loader when there's no canvas to wait for. Kept out of render so
  // rendering stays free of side effects.
  useEffect(() => {
    if (!sceneActive || webglSupported === null) return;
    if (!webglSupported || broken) {
      sceneReady.ready = false;
      sceneReady.failed = true;
      // No scene means no EVA; don't leave a request to fire later.
      cancelPendingFreeMode();
    }
  }, [sceneActive, webglSupported, broken]);

  if (!sceneActive || webglSupported === null) return null;

  if (!webglSupported || broken) return <SceneFallback />;

  if (!tier) return null;

  const dpr: [number, number] = tier.mobile
    ? [0.8, 1.25]
    : tier.weak
    ? [1, 1.5]
    : [1, 2.5];

  return (
    <div className="scene-root" role="region" aria-label="Interactive 3D service navigation">
      <SceneCanvas
        dpr={dpr}
        weak={tier.weak}
        onBroken={() => {
          sceneReady.failed = true;
          setBroken(true);
        }}
      />
    </div>
  );
}

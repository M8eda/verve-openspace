"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SceneFallback from "./SceneFallback";
import { isMobileTier, isWeakGPU, supportsWebGL } from "@/lib/device";
import { sceneReady } from "@/lib/scrollState";

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

  if (!sceneActive) return null;

  if (webglSupported === null) {
    sceneReady.ready = false;
    sceneReady.failed = false;
    return null;
  }

  if (!webglSupported || broken) {
    sceneReady.ready = false;
    sceneReady.failed = true;
    return <SceneFallback />;
  }

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

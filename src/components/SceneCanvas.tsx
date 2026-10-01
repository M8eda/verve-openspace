"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, addAfterEffect } from "@react-three/fiber";
import * as THREE from "three";
import Scene from "./scene/Scene";
import { sceneReady } from "@/lib/scrollState";
import { consumePendingFreeMode } from "@/lib/freeMode";
import { trackEvent } from "@/lib/analytics";

/** How long we wait for a lost context to come back before giving up on it. */
const CONTEXT_LOST_GRACE_MS = 2500;

type SceneCanvasProps = {
  dpr: [number, number];
  weak: boolean;
  onBroken: () => void;
};

export default function SceneCanvas({ dpr, weak, onBroken }: SceneCanvasProps) {
  const lostTimer = useRef<number | undefined>(undefined);
  const stopFirstFrameWatch = useRef<(() => void) | undefined>(undefined);
  // Frames are held back until Scene has compiled its shaders.
  const [compiled, setCompiled] = useState(false);
  const contextListeners = useRef<{
    canvas: HTMLCanvasElement;
    onLost: (e: Event) => void;
    onRestored: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      sceneReady.ready = false;
      window.clearTimeout(lostTimer.current);
      stopFirstFrameWatch.current?.();
      const listeners = contextListeners.current;
      if (!listeners) return;

      listeners.canvas.removeEventListener("webglcontextlost", listeners.onLost, false);
      listeners.canvas.removeEventListener("webglcontextrestored", listeners.onRestored, false);
      contextListeners.current = null;
    };
  }, []);

  const onCompiled = useCallback(() => {
    setCompiled(true);
    // Lift the loader only once the first frame is drawn, so the composer's
    // own passes also compile behind it.
    stopFirstFrameWatch.current?.();
    const stop = addAfterEffect(() => {
      stop();
      stopFirstFrameWatch.current = undefined;
      sceneReady.ready = true;
    });
    stopFirstFrameWatch.current = stop;
  }, []);

  return (
    <Canvas
      dpr={dpr}
      frameloop={compiled ? "always" : "never"}
      camera={{ fov: 38, near: 0.1, far: 1200, position: [0, 3, 38] }}
      gl={{
        antialias: !weak,
        powerPreference: weak ? "default" : "high-performance",
        stencil: false,
        depth: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      onCreated={({ gl }) => {
        sceneReady.failed = false;

        // EVA requested from another page opens now that there's a scene to fly.
        if (consumePendingFreeMode()) {
          trackEvent("eva_toggle", { state: "enter", source: "header_cross_route" });
        }

        const canvas = gl.domElement;

        const onLost = (e: Event) => {
          e.preventDefault();
          sceneReady.ready = false;
          window.clearTimeout(lostTimer.current);
          lostTimer.current = window.setTimeout(() => {
            sceneReady.failed = true;
            onBroken();
          }, CONTEXT_LOST_GRACE_MS);
        };

        const onRestored = () => {
          window.clearTimeout(lostTimer.current);
          sceneReady.ready = true;
          sceneReady.failed = false;
        };

        canvas.addEventListener("webglcontextlost", onLost, false);
        canvas.addEventListener("webglcontextrestored", onRestored, false);
        contextListeners.current = { canvas, onLost, onRestored };
      }}
      onPointerMissed={() => undefined}
    >
      <Scene dpr={dpr} onCompiled={onCompiled} />
    </Canvas>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Scene from "./scene/Scene";
import { sceneReady } from "@/lib/scrollState";

/** How long we wait for a lost context to come back before giving up on it. */
const CONTEXT_LOST_GRACE_MS = 2500;

type SceneCanvasProps = {
  dpr: [number, number];
  weak: boolean;
  onBroken: () => void;
};

export default function SceneCanvas({ dpr, weak, onBroken }: SceneCanvasProps) {
  const lostTimer = useRef<number | undefined>(undefined);
  const contextListeners = useRef<{
    canvas: HTMLCanvasElement;
    onLost: (e: Event) => void;
    onRestored: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      sceneReady.ready = false;
      window.clearTimeout(lostTimer.current);
      const listeners = contextListeners.current;
      if (!listeners) return;

      listeners.canvas.removeEventListener("webglcontextlost", listeners.onLost, false);
      listeners.canvas.removeEventListener("webglcontextrestored", listeners.onRestored, false);
      contextListeners.current = null;
    };
  }, []);

  return (
    <Canvas
      dpr={dpr}
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
      performance={{ min: 0.4 }}
      onCreated={({ gl }) => {
        sceneReady.ready = true;
        sceneReady.failed = false;

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
      <Scene />
    </Canvas>
  );
}

"use client";

/**
 * Rendered instead of the WebGL scene when this device can't run it (no
 * WebGL support at all, or the context was lost and didn't recover). A
 * plain CSS radial gradient standing in for the core glow — no planets,
 * but never a flat black rectangle either. The real content (hero copy,
 * the sr-only service list, captions) is unaffected either way since none
 * of it depends on the canvas.
 */
export default function SceneFallback() {
  return <div className="scene-root scene-fallback" aria-hidden="true" />;
}

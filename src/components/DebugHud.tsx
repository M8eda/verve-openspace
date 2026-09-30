"use client";

import { useEffect, useRef, useState } from "react";
import { scrollState } from "@/lib/scrollState";
import { subscribeFrame } from "@/lib/frameLoop";

/**
 * Developer readout. Only shows when the URL contains ?debug
 * e.g. http://localhost:3000/?debug
 * Writes straight to the DOM every frame (no React state) so it costs nothing.
 */
export default function DebugHud() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let last = performance.now();
    let fps = 60;
    let lastText = "";

    return subscribeFrame((now) => {
      const dt = now - last;
      last = now;
      if (dt > 0) fps = fps * 0.94 + (1000 / dt) * 0.06;

      const text = `scroll ${(scrollState.progress * 100).toFixed(1)}%   velocity ${scrollState.velocity.toFixed(2)}   ${fps.toFixed(0)} fps`;
      if (text !== lastText && ref.current) {
        ref.current.textContent = text;
        lastText = text;
      }
    });
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} className="debug-hud" />;
}

"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { subscribeFrame } from "@/lib/frameLoop";

let lenisInstance: Lenis | null = null;

export function pauseLenis() {
  lenisInstance?.stop();
}

export function resumeLenis() {
  lenisInstance?.start();
}

export default function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      lerp: reduceMotion ? 1 : 0.085,
      smoothWheel: !reduceMotion,
      syncTouch: false,
      touchMultiplier: 1,
    });
    lenisInstance = lenis;

    const unsubscribeFrame = subscribeFrame((time) => {
      lenis.raf(time);
    });

    return () => {
      unsubscribeFrame();
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return null;
}

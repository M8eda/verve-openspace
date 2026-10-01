"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cancelPendingFreeMode, closeFreeMode } from "@/lib/freeMode";

/**
 * Keeps the fixed canvas layer hidden outside the home page, where the
 * scroll-driven journey doesn't apply. SceneRoot also unmounts the heavy
 * scene subtree on those routes so the GPU isn't rendering invisible work.
 */
export default function SceneVisibility() {
  const pathname = usePathname();

  useEffect(() => {
    closeFreeMode();
    // Left for another page before the home scene came up: drop the EVA request.
    if (pathname !== "/") cancelPendingFreeMode();
    document.documentElement.classList.toggle("scene-hidden", pathname !== "/");
  }, [pathname]);

  return null;
}

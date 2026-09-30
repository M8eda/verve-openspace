"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { closeFreeMode } from "@/lib/freeMode";

/**
 * Keeps the fixed canvas layer hidden outside the home page, where the
 * scroll-driven journey doesn't apply. SceneRoot also unmounts the heavy
 * scene subtree on those routes so the GPU isn't rendering invisible work.
 */
export default function SceneVisibility() {
  const pathname = usePathname();

  useEffect(() => {
    closeFreeMode();
    document.documentElement.classList.toggle("scene-hidden", pathname !== "/");
  }, [pathname]);

  return null;
}

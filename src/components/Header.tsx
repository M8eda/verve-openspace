"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isFreeMode,
  subscribeFreeMode,
  toggleFreeMode,
  closeFreeMode,
} from "@/lib/freeMode";
import { playGlassHover, playGlassClick } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { openContactPanel } from "@/lib/contactPanel";

export default function Header() {
  const router = useRouter();
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    setFreeMode(isFreeMode());
    return subscribeFreeMode(setFreeMode);
  }, []);

  const handleEvaClick = () => {
    if (typeof window === "undefined") return;
    const isHome = window.location.pathname === "/";

    if (freeMode) {
      // Exiting EVA. If we're not on the home page, go home so the journey
      // is visible again.
      trackEvent("eva_toggle", { state: "exit", source: "header" });
      closeFreeMode();
      if (!isHome) router.push("/");
      return;
    }

    if (isHome) {
      // Simple case: on the home page, just enter EVA.
      trackEvent("eva_toggle", { state: "enter", source: "header" });
      toggleFreeMode();
      return;
    }

    // We're on a service (or other) page and the user wants to enter EVA.
    // Route home first, then enable EVA once the home page has mounted.
    router.push("/");
    window.setTimeout(() => {
      // Guard: the user may have navigated again in the meantime.
      if (window.location.pathname === "/") {
        trackEvent("eva_toggle", { state: "enter", source: "header_cross_route" });
        toggleFreeMode();
      }
    }, 150);
  };

  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Verve, home">
        <Image src="/icon.svg" alt="" className="wordmark-logo" aria-hidden="true" width={28} height={28} priority />
        <span>Verve</span>
        <span className="wordmark-dot" aria-hidden="true" />
      </a>
      <div className="header-actions">
        <button
          type="button"
          className="header-link"
          onMouseEnter={() => playGlassHover()}
          onClick={() => {
            playGlassClick();
            handleEvaClick();
          }}
          aria-pressed={freeMode}
          title={freeMode ? "Return to the main page" : "Free-float: orbit, zoom, and pan freely"}
        >
          {freeMode ? "Exit EVA" : "EVA"}
        </button>
        <button
          type="button"
          className="header-link"
          onMouseEnter={() => playGlassHover()}
          onClick={() => {
            playGlassClick();
            openContactPanel("header_contact");
          }}
        >
          Contact
        </button>
      </div>
    </header>
  );
}

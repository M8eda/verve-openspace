"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  hasTriedEva,
  isFreeMode,
  subscribeFreeMode,
  toggleFreeMode,
  closeFreeMode,
  requestFreeModeOnHome,
} from "@/lib/freeMode";
import { playGlassHover, playGlassClick, isSoundOn, setSoundOn, subscribeSound } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { openContactPanel } from "@/lib/contactPanel";

export default function Header() {
  const router = useRouter();
  const [freeMode, setFreeMode] = useState(false);
  // Pulses until the visitor has opened EVA once, so the feature gets found.
  const [evaNew, setEvaNew] = useState(false);
  // Server render assumes sound off; the stored choice applies after hydration.
  const soundOn = useSyncExternalStore(subscribeSound, isSoundOn, () => false);

  useEffect(() => {
    setFreeMode(isFreeMode());
    setEvaNew(!hasTriedEva());
    return subscribeFreeMode((open) => {
      setFreeMode(open);
      if (open) setEvaNew(false);
    });
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
    // Route home; the scene opens EVA itself once its canvas is up, however
    // long that takes on this device.
    requestFreeModeOnHome();
    router.push("/");
  };

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Verve, home">
        <Image src="/icon.svg" alt="" className="wordmark-logo" aria-hidden="true" width={28} height={28} priority />
        <span>Verve</span>
        <span className="wordmark-dot" aria-hidden="true" />
      </Link>
      <div className="header-actions">
        <button
          type="button"
          className="header-link header-sound"
          onClick={() => {
            setSoundOn(!soundOn);
            // Confirms the switch back on; silent when muting.
            playGlassClick();
          }}
          aria-pressed={soundOn}
          aria-label="Interface sounds"
          title={soundOn ? "Mute interface sounds" : "Turn interface sounds on"}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            {soundOn ? (
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            ) : (
              <path d="m16 9 6 6M22 9l-6 6" />
            )}
          </svg>
        </button>
        <button
          type="button"
          className={`header-link header-eva${evaNew && !freeMode ? " is-new" : ""}`}
          onMouseEnter={() => playGlassHover()}
          onClick={() => {
            playGlassClick();
            handleEvaClick();
          }}
          aria-pressed={freeMode}
          title={freeMode ? "Leave free roam (Esc)" : "Free roam: fly around the system and click any planet"}
        >
          {freeMode ? (
            "Exit EVA"
          ) : (
            <>
              <span className="header-eva-dot" aria-hidden="true" />
              EVA<span className="header-eva-sub"> · Free roam</span>
            </>
          )}
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

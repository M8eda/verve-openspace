"use client";

import { useEffect, useRef, useCallback } from "react";
import { pagerState, pagerPosition, PAGE_COUNT } from "@/lib/journeyPager";
import { scrollState } from "@/lib/scrollState";
import { prefersReducedMotion } from "@/lib/device";
import { pauseLenis, resumeLenis } from "@/components/SmoothScroll";
import { isFreeMode } from "@/lib/freeMode";
import { isContactOpen } from "@/lib/contactPanel";
import { lockPageScroll, unlockPageScroll } from "@/lib/scrollLock";
import { playGlassTing } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { subscribeFrame } from "@/lib/frameLoop";

let globalJumpToPage: (targetIndex: number) => void = () => {};

export function jumpToPage(targetIndex: number) {
  globalJumpToPage(targetIndex);
}

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

const JOURNEY_SCROLL_LOCK = "journey-pager";

export default function JourneyPager() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engagedRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(pagerState.index >= PAGE_COUNT - 1);
  const cooldownRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const cancelTransitionRef = useRef<(() => void) | null>(null);

  const setEngaged = (engaged: boolean) => {
    if (engagedRef.current === engaged) return;
    engagedRef.current = engaged;

    if (engaged) {
      pauseLenis();
      lockPageScroll(JOURNEY_SCROLL_LOCK);
    } else {
      unlockPageScroll(JOURNEY_SCROLL_LOCK);
      resumeLenis();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // If we're returning to the home page after already entering the
    // journey, pagerState.index is still wherever the user left it, but
    // engagedRef reset to false on this remount. Re-engage so wheel,
    // touch, and keyboard input work again and the body stays locked.
    if (pagerState.index > 0) {
      engagedRef.current = true;
      pauseLenis();
      lockPageScroll(JOURNEY_SCROLL_LOCK);
    } else {
      window.scrollTo(0, 0);
    }

    // Leaving home mid-journey (e.g. "Explore planet") must hand scrolling
    // back, or the next page opens with smooth scroll still stopped.
    return () => setEngaged(false);
  }, []);

  /** Eases the pager from its settled index to `target`, then settles there. */
  const animateTo = useCallback((target: number, duration: number, source: "jump" | "scroll") => {
    pagerState.locked = true;
    pagerState.fromIndex = pagerState.index;
    pagerState.toIndex = target;
    pagerState.t = 0;

    cancelTransitionRef.current?.();

    const length = prefersReducedMotion() ? 1 : duration;
    const startTime = performance.now();

    cancelTransitionRef.current = subscribeFrame((now) => {
      const rawProgress = Math.min(1, (now - startTime) / length);
      pagerState.t = smoothstep(rawProgress);

      if (rawProgress >= 1) {
        pagerState.index = target;
        pagerState.fromIndex = target;
        pagerState.toIndex = target;
        pagerState.t = 1;
        if (target >= PAGE_COUNT - 1 && !completedRef.current) {
          completedRef.current = true;
          trackEvent("journey_completed", { source });
        }
        cooldownRef.current = performance.now() + 300;
        pagerState.locked = false;
        cancelTransitionRef.current?.();
        cancelTransitionRef.current = null;
      }
    });
  }, []);

  const executeJump = useCallback((targetIndex: number, forceEngage?: boolean) => {
    const clampedTarget = Math.max(0, Math.min(PAGE_COUNT - 1, targetIndex));
    if (pagerState.locked && pagerState.toIndex === clampedTarget) return;

    if (forceEngage && !engagedRef.current) {
      setEngaged(true);
    }

    const currentIdx = pagerState.toIndex;
    if (currentIdx === clampedTarget && pagerState.t === 1) return;

    animateTo(clampedTarget, 700 + Math.abs(clampedTarget - currentIdx) * 120, "jump");
  }, [animateTo]);

  useEffect(() => {
    globalJumpToPage = (targetIndex: number) => {
      executeJump(targetIndex, true);
    };
  }, [executeJump]);

  const step = useCallback((direction: 1 | -1) => {
    if (pagerState.locked) return;
    if (performance.now() < cooldownRef.current) return;

    const currentIdx = pagerState.index;

    // Release at top boundary (index 0, step -1)
    if (currentIdx === 0 && direction === -1) {
      setEngaged(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Hold at bottom boundary (last page, i.e. Core Star). The visible
    // caption CTA is responsible for sending visitors into the Core page.
    if (currentIdx === PAGE_COUNT - 1 && direction === 1) {
      return;
    }

    const nextIdx = Math.max(0, Math.min(PAGE_COUNT - 1, currentIdx + direction));
    if (nextIdx === currentIdx) return;

    // Subtle ping for navigation step
    playGlassTing({ frequency: 3200, volume: 0.01, decay: 0.05 });

    animateTo(nextIdx, 700, "scroll");
  }, [animateTo]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isFreeMode() || isContactOpen()) return;
      if (!engagedRef.current) {
        // Re-engage when user is at the Core stop and scrolls UP
        if (e.deltaY < 0 && pagerState.index >= PAGE_COUNT - 1 && window.scrollY <= 10) {
          e.preventDefault();
          setEngaged(true);
          step(-1);
          return;
        }

        if (window.scrollY <= 100 && e.deltaY > 0 && pagerState.index === 0) {
          e.preventDefault();
          window.scrollTo(0, 0);
          setEngaged(true);
          step(1);
        }
        return;
      }

      e.preventDefault();
      if (pagerState.locked) return;
      const dir = Math.sign(e.deltaY);
      if (dir !== 0) {
        step(dir > 0 ? 1 : -1);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isFreeMode() || isContactOpen()) return;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isFreeMode() || isContactOpen()) return;
      if (!engagedRef.current) return;
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isFreeMode() || isContactOpen()) return;
      const endY = e.changedTouches[0].clientY;
      const deltaY = touchStartYRef.current - endY;

      if (!engagedRef.current) {
        if (deltaY < -50 && pagerState.index >= PAGE_COUNT - 1 && window.scrollY <= 10) {
          setEngaged(true);
          step(-1);
          return;
        }

        if (window.scrollY <= 100 && deltaY > 50 && pagerState.index === 0) {
          window.scrollTo(0, 0);
          setEngaged(true);
          step(1);
        }
        return;
      }

      if (Math.abs(deltaY) > 50) {
        step(deltaY > 0 ? 1 : -1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFreeMode() || isContactOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if (active?.closest("input, textarea, select, [contenteditable='true']")) return;
      // Space presses the focused control; it must not also fly the camera.
      if (e.key === " " && active?.closest("button, a[href], summary, [role='button'], [role='link']")) return;

      if (!engagedRef.current) {
        if ((e.key === "ArrowUp" || e.key === "PageUp") && pagerState.index >= PAGE_COUNT - 1 && window.scrollY <= 10) {
          e.preventDefault();
          setEngaged(true);
          step(-1);
          return;
        }

        if ((e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") && window.scrollY <= 100 && pagerState.index === 0) {
          e.preventDefault();
          window.scrollTo(0, 0);
          setEngaged(true);
          step(1);
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        step(-1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    let lastProgress = "";
    let lastHeroOpacity = "";
    let heroHidden: boolean | null = null;
    let heroEl: HTMLElement | null = null;

    const unsubscribeFrame = subscribeFrame(() => {
      if (isFreeMode()) return;
      const scrollY = window.scrollY;

      if (!engagedRef.current && pagerState.index === 0 && scrollY > 20) {
        window.scrollTo(0, 0);
        setEngaged(true);
        step(1);
      }

      const p = pagerPosition();
      const progress = p / (PAGE_COUNT - 1);
      scrollState.progress = progress;

      const progressValue = progress.toFixed(4);
      if (progressValue !== lastProgress) {
        document.documentElement.style.setProperty("--p", progressValue);
        lastProgress = progressValue;
      }

      heroEl ??= document.querySelector(".hero") as HTMLElement | null;
      if (heroEl) {
        const nextOpacity = Math.max(0, 1 - p * 2).toFixed(3);
        if (nextOpacity !== lastHeroOpacity) {
          heroEl.style.opacity = nextOpacity;
          lastHeroOpacity = nextOpacity;
        }

        const nextHidden = Number(nextOpacity) <= 0.01;
        if (nextHidden !== heroHidden) {
          heroHidden = nextHidden;
          if (nextHidden) {
            heroEl.style.visibility = "hidden";
            heroEl.style.pointerEvents = "none";
            heroEl.setAttribute("data-hidden", "true");
          } else {
            heroEl.style.visibility = "visible";
            heroEl.style.pointerEvents = "auto";
            heroEl.removeAttribute("data-hidden");
          }
        }
      }
    });

    return () => {
      cancelTransitionRef.current?.();
      cancelTransitionRef.current = null;
      pagerState.locked = false;
      unsubscribeFrame();
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      unlockPageScroll(JOURNEY_SCROLL_LOCK);
    };
  }, [step]);

  return (
    <div
      ref={containerRef}
      className="journey"
      style={{ height: "100vh" }}
      aria-hidden="true"
    />
  );
}


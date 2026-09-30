import type Lenis from "lenis";

let activeLenis: Lenis | null = null;

export function registerLenis(lenis: Lenis | null): void {
  activeLenis = lenis;
}

/**
 * Smoothly scrolls the window to a normalized progress value (0..1)
 * along the page's entire scroll runway.
 */
export function scrollToProgress(progress: number, duration = 1.2): void {
  const root = document.documentElement;
  const journeyEl = document.querySelector('.journey') as HTMLElement | null;
  let target: number;
  if (journeyEl) {
    const journeyTop = journeyEl.offsetTop;
    const journeyHeight = journeyEl.offsetHeight;
    const scrollRange = journeyHeight - window.innerHeight;
    target = journeyTop + Math.max(0, Math.min(1, progress)) * Math.max(0, scrollRange);
  } else {
    const max = root.scrollHeight - window.innerHeight;
    target = Math.max(0, Math.min(1, progress)) * Math.max(0, max);
  }

  if (activeLenis) {
    activeLenis.scrollTo(target, { duration });
  } else {
    window.scrollTo({
      top: target,
      behavior: "smooth",
    });
  }
}

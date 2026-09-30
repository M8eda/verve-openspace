"use client";

import { useEffect, useRef } from "react";
import { services } from "@/data/services";
import { pagerPosition } from "@/lib/journeyPager";
import { subscribeFrame } from "@/lib/frameLoop";

type Stop = {
  param: number;
  eyebrow: string;
  title: string;
  line: string;
  href: string | null;
};

const CORE_PARAM = services.length + 2;

const STOPS: Stop[] = [
  {
    param: 1, // Index 1: System Overview
    eyebrow: "00 / SYSTEM OVERVIEW",
    title: "Your Market, Mapped",
    line: "A cold, crowded space, until something pulls it into orbit. Scroll to traverse the forces that make it yours.",
    href: null,
  },
  ...services.map((s, k) => ({
    param: k + 2, // Indices 2 through 10 (9 service planets)
    eyebrow: `${String(s.index).padStart(2, "0")} / SERVICE`,
    title: s.name,
    line: s.tagline,
    href: `/services/${s.slug}`,
  })),
  {
    param: CORE_PARAM, // Final index: Central Core Star / Sun
    eyebrow: "10 / LAUNCHPAD",
    title: "Verve Core",
    line: "Arrival at system core & launchpad. Mission control ready.",
    href: "#enter-core",
  },
];

const WINDOW = 0.65;
const CLICK_THRESHOLD = 0.55;

export default function JourneyCaptions() {
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const shown = useRef(-1);

  useEffect(() => {
    let hidden = true;
    let lastOpacity = "0";
    let lastTransform = "";
    let lastClickable: boolean | null = null;

    return subscribeFrame(() => {
      const p = pagerPosition(); // 0..PAGE_COUNT-1
      let best = -1;
      let bestDist = Infinity;

      for (let i = 0; i < STOPS.length; i++) {
        const d = Math.abs(p - STOPS[i].param);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }

      let opacity = Math.max(0, 1 - bestDist / WINDOW);

      // Hide caption at Index 0 (Hero) or after the final Core stop.
      if (p < 0.6 || p > CORE_PARAM + 0.4) {
        opacity = 0;
      }

      if (rootRef.current) {
        const nextHidden = opacity <= 0.005;
        if (nextHidden !== hidden) {
          hidden = nextHidden;
          if (nextHidden) {
            rootRef.current.style.opacity = "0";
            rootRef.current.style.pointerEvents = "none";
            rootRef.current.style.visibility = "hidden";
            rootRef.current.style.display = "none";
            rootRef.current.setAttribute("data-hidden", "true");
            rootRef.current.setAttribute("aria-hidden", "true");

            if (shown.current !== -1) {
              shown.current = -1;
              if (eyebrowRef.current) eyebrowRef.current.textContent = "";
              if (titleRef.current) titleRef.current.textContent = "";
              if (lineRef.current) lineRef.current.textContent = "";
            }
          } else {
            rootRef.current.style.display = "flex";
            rootRef.current.style.visibility = "visible";
            rootRef.current.removeAttribute("data-hidden");
            rootRef.current.removeAttribute("aria-hidden");
          }
        }

        if (!nextHidden) {
          const nextOpacity = opacity.toFixed(3);
          if (nextOpacity !== lastOpacity) {
            rootRef.current.style.opacity = nextOpacity;
            rootRef.current.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
            lastOpacity = nextOpacity;
          }

          // Slide down into place as it fades in — same opacity value
          // drives both, so they stay perfectly in sync with scroll.
          const eased = opacity * opacity * (3 - 2 * opacity); // smoothstep
          const offsetPx = (1 - eased) * -28;
          const nextTransform = `translateY(${offsetPx.toFixed(1)}px)`;
          if (nextTransform !== lastTransform) {
            rootRef.current.style.transform = nextTransform;
            lastTransform = nextTransform;
          }
        }
      }

      if (linkRef.current) {
        const clickable = opacity > CLICK_THRESHOLD && !!STOPS[best]?.href;
        if (clickable !== lastClickable) {
          linkRef.current.style.pointerEvents = clickable ? "auto" : "none";
          linkRef.current.style.opacity = clickable ? "1" : "0";
          linkRef.current.tabIndex = clickable ? 0 : -1;
          linkRef.current.setAttribute("aria-hidden", clickable ? "false" : "true");
          lastClickable = clickable;
        }
      }

      if (best !== shown.current && opacity > 0.02) {
        shown.current = best;
        const stop = STOPS[best];
        if (eyebrowRef.current) eyebrowRef.current.textContent = stop.eyebrow;
        if (titleRef.current) titleRef.current.textContent = stop.title;
        if (lineRef.current) lineRef.current.textContent = stop.line;
        if (linkRef.current) {
          if (stop.href === "#enter-core") {
            linkRef.current.href = "/core";
            linkRef.current.textContent = "Open mission control →";
            linkRef.current.style.display = "inline-block";
            linkRef.current.onclick = null;
          } else if (stop.href) {
            linkRef.current.href = stop.href;
            linkRef.current.textContent = "Explore this planet →";
            linkRef.current.style.display = "inline-block";
            linkRef.current.onclick = null;
          } else {
            linkRef.current.removeAttribute("href");
            linkRef.current.onclick = null;
            linkRef.current.style.display = "none";
          }
        }
      }
    });
  }, []);

  return (
    <div
      ref={rootRef}
      className="journey-caption"
      style={{ opacity: 0 }}
      aria-hidden="true"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="journey-caption-inner">
        <span ref={eyebrowRef} className="journey-caption-eyebrow" />
        <h2 ref={titleRef} className="journey-caption-title" />
        <p ref={lineRef} className="journey-caption-line" />
        <a
          ref={linkRef}
          className="journey-caption-link"
          tabIndex={-1}
          aria-hidden="true"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          View service →
        </a>
      </div>
    </div>
  );
}

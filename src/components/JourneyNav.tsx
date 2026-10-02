"use client";

import { useEffect, useRef, useState } from "react";
import { JOURNEY_WAYPOINTS, type JourneyWaypoint } from "@/lib/journey";
import { pagerState, pagerPosition, PAGE_COUNT } from "@/lib/journeyPager";
import { jumpToPage } from "@/components/JourneyPager";
import { playGlassHover, playGlassClick } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { subscribeFrame } from "@/lib/frameLoop";
import { services } from "@/data/services";

/** Stop codes run 00 (overview) to the core; home has no screen of its own. */
const LAST_CODE = PAGE_COUNT - 2;
const pad = (n: number) => String(n).padStart(2, "0");
const BRAND = "#cdf757";

/** Each segment's own colour (its planet's, brand lime otherwise), shown
 *  all at once when the finale completes the journey. */
const segStyle = (wp: JourneyWaypoint, i: number) =>
  ({
    "--seg": services.find((s) => s.slug === wp.slug)?.visual.color ?? BRAND,
    "--i": i,
  }) as React.CSSProperties;

/**
 * Stop selector built into the journey terminal's bottom plate. One segment
 * per stop, filled as the camera reaches it, so the bar sweeps along
 * mid-flight. Clicking a segment jumps straight to that stop.
 */
export default function JourneyNav() {
  const [hovered, setHovered] = useState<JourneyWaypoint | null>(null);
  const segRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fills: string[] = new Array(PAGE_COUNT).fill("");
    let lastActive = -1;

    return subscribeFrame(() => {
      const p = pagerPosition();
      for (let i = 0; i < PAGE_COUNT; i++) {
        const el = segRefs.current[i];
        if (!el) continue;
        // Segment i fills over the last page of travel into stop i.
        const fill = Math.max(0, Math.min(1, p - i + 1)).toFixed(3);
        if (fill !== fills[i]) {
          el.style.setProperty("--fill", fill);
          fills[i] = fill;
        }
      }

      const active = pagerState.toIndex;
      if (active === lastActive) return;
      const prev = segRefs.current[lastActive];
      if (prev) {
        prev.dataset.state = "";
        prev.removeAttribute("aria-current");
      }
      const next = segRefs.current[active];
      if (next) {
        next.dataset.state = "active";
        next.setAttribute("aria-current", "step");
      }
      if (countRef.current) {
        countRef.current.textContent = `${pad(Math.max(0, active - 1))}/${pad(LAST_CODE)}`;
      }
      lastActive = active;
    });
  }, []);

  const jump = (wp: JourneyWaypoint) => {
    playGlassClick();
    trackEvent("journey_timeline_jump", {
      waypoint: wp.id,
      label: wp.label,
      index: wp.index,
    });
    jumpToPage(wp.index);
  };

  const point = (wp: JourneyWaypoint) => {
    playGlassHover();
    setHovered(wp);
  };

  const tipAlign =
    hovered && hovered.index < 3 ? "start" : hovered && hovered.index > PAGE_COUNT - 4 ? "end" : "center";

  return (
    <nav className="terminal-nav" aria-label="Journey stops">
      <div className="terminal-nav-track">
        {JOURNEY_WAYPOINTS.map((wp, i) => (
          <button
            key={wp.id}
            type="button"
            ref={(el) => {
              segRefs.current[i] = el;
            }}
            className="terminal-nav-seg"
            style={segStyle(wp, i)}
            aria-label={`Jump to ${wp.label}`}
            onClick={() => jump(wp)}
            onMouseEnter={() => point(wp)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(wp)}
            onBlur={() => setHovered(null)}
          />
        ))}
        {hovered && (
          <span
            className="terminal-nav-tip"
            data-align={tipAlign}
            style={{ "--at": `${(((hovered.index + 0.5) / PAGE_COUNT) * 100).toFixed(2)}%` } as React.CSSProperties}
            aria-hidden="true"
          >
            {hovered.label}
          </span>
        )}
      </div>
      <span ref={countRef} className="terminal-nav-count" aria-hidden="true" />
    </nav>
  );
}

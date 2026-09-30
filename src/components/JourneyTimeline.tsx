"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { JOURNEY_WAYPOINTS, type JourneyWaypoint } from "@/lib/journey";
import { pagerState, pagerPosition, PAGE_COUNT } from "@/lib/journeyPager";
import { jumpToPage } from "@/components/JourneyPager";
import { scrollState } from "@/lib/scrollState";
import { playGlassHover, playGlassClick } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { subscribeFrame } from "@/lib/frameLoop";

export default function JourneyTimeline() {
  const [hoveredWp, setHoveredWp] = useState<JourneyWaypoint | null>(null);
  const [hoverY, setHoverY] = useState<number>(0);

  const fillRef = useRef<HTMLDivElement>(null);
  const seekerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let lastPct = "";

    return subscribeFrame(() => {
      const p = pagerPosition(); // 0..PAGE_COUNT-1
      const pct = Math.max(0, Math.min(100, (p / (PAGE_COUNT - 1)) * 100)).toFixed(2);

      if (pct !== lastPct) {
        if (fillRef.current) {
          fillRef.current.style.height = `${pct}%`;
        }
        if (seekerRef.current) {
          seekerRef.current.style.top = `${pct}%`;
        }
        lastPct = pct;
      }

      const activeIdx = pagerState.toIndex;

      for (let i = 0; i < JOURNEY_WAYPOINTS.length; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;

        const isPassed = i <= pagerState.index;
        const isActive = i === activeIdx;

        let state = "upcoming";
        if (isActive) {
          state = "active";
        } else if (isPassed) {
          state = "passed";
        }

        if (el.dataset.state !== state) {
          el.dataset.state = state;
          if (isActive) {
            el.setAttribute("aria-current", "step");
          } else {
            el.removeAttribute("aria-current");
          }
        }
      }
    });
  }, []);

  const handleRailClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".journey-node-btn")) {
      return;
    }
    const rail = railRef.current;
    if (!rail) return;
    playGlassClick();
    const rect = rail.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, offsetY / rect.height));
    const targetIdx = Math.round(ratio * (PAGE_COUNT - 1));
    jumpToPage(targetIdx);
  }, []);

  const handleNodeClick = useCallback((wp: JourneyWaypoint) => {
    playGlassClick();
    trackEvent("journey_timeline_jump", {
      waypoint: wp.id,
      label: wp.label,
      index: wp.index,
    });
    jumpToPage(wp.index);
  }, []);

  const handleNodeMouseEnter = (wp: JourneyWaypoint, index: number) => {
    playGlassHover();
    const el = nodeRefs.current[index];
    if (el && railRef.current) {
      const railRect = railRef.current.getBoundingClientRect();
      const nodeRect = el.getBoundingClientRect();
      const relativeY = nodeRect.top - railRect.top + nodeRect.height / 2;
      setHoverY(relativeY);
    }
    setHoveredWp(wp);
  };

  const handleNodeMouseLeave = () => {
    setHoveredWp(null);
  };

  return (
    <nav
      className="journey-timeline"
      aria-label="Mission journey flight path"
      role="navigation"
    >
      <div
        ref={railRef}
        className="journey-timeline-rail"
        onClick={handleRailClick}
        title="Click any point to navigate"
      >
        {/* Background track line */}
        <div className="journey-timeline-track" />

        {/* Dynamic Glowing Emerald active track line */}
        <div ref={fillRef} className="journey-timeline-fill" />

        {/* Dynamic Seeker Reticle tracking instant scroll */}
        <div ref={seekerRef} className="journey-timeline-seeker" aria-hidden="true" />

        {/* Waypoint Nodes */}
        <div className="journey-timeline-nodes">
          {JOURNEY_WAYPOINTS.map((wp, i) => (
            <div
              key={wp.id}
              className="journey-node-wrapper"
              style={{ top: `${((i / (PAGE_COUNT - 1)) * 100).toFixed(2)}%` }}
            >
              <button
                type="button"
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className="journey-node-btn"
                data-state={i === 0 ? "active" : "upcoming"}
                aria-label={`Jump to ${wp.label} (${wp.code})`}
                onClick={() => handleNodeClick(wp)}
                onMouseEnter={() => handleNodeMouseEnter(wp, i)}
                onMouseLeave={handleNodeMouseLeave}
                onFocus={() => handleNodeMouseEnter(wp, i)}
                onBlur={handleNodeMouseLeave}
              >
                {/* Vertical Reticle Tick Mark */}
                <span className="journey-node-tick" aria-hidden="true" />

                {/* Outer Ring */}
                <span className="journey-node-ring" aria-hidden="true">
                  {/* Radar ping ripple for active state */}
                  <span className="journey-node-ping" aria-hidden="true" />
                  {/* Inner Solid Dot */}
                  <span className="journey-node-dot" aria-hidden="true" />
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Sci-Fi HUD Telemetry Hover Tooltip Card */}
        {hoveredWp && (
          <div
            className="journey-hud-card"
            style={{ top: `${hoverY}px` }}
            aria-live="polite"
          >
            <div className="journey-hud-header">
              <span className="journey-hud-code">{hoveredWp.code}</span>
              <span className="journey-hud-status">
                {pagerState.toIndex === hoveredWp.index
                  ? "[CURRENT]"
                  : pagerState.toIndex > hoveredWp.index
                  ? "[PASSED]"
                  : "[TARGET]"}
              </span>
            </div>
            <div className="journey-hud-title">{hoveredWp.label}</div>
            <div className="journey-hud-tagline">{hoveredWp.tagline}</div>
            <div className="journey-hud-prompt">Click to engage jump →</div>
          </div>
        )}
      </div>
    </nav>
  );
}

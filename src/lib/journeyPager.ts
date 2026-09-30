import { JOURNEY_WAYPOINTS } from "./journey";

export const PAGE_COUNT = JOURNEY_WAYPOINTS.length;

/**
 * Discrete paging state. Same pattern as scrollState.ts — a plain
 * mutable object polled in rAF loops, NEVER put in React state.
 */
export const pagerState = {
  /** Settled waypoint index (0..PAGE_COUNT-1). Equals toIndex when idle. */
  index: 0,
  /** Index we're animating FROM. Equals index when idle. */
  fromIndex: 0,
  /** Index we're animating TO. Equals index when idle. */
  toIndex: 0,
  /** 0..1 eased progress of the current transition. Irrelevant when idle. */
  t: 0,
  /** True while a transition is in flight — all input must be ignored. */
  locked: false,
};

/** Continuous position derived from pager state, 0..PAGE_COUNT-1.
    This is what CameraRig/Galaxy/JourneyTimeline actually read. */
export function pagerPosition(): number {
  return pagerState.fromIndex + pagerState.t * (pagerState.toIndex - pagerState.fromIndex);
}

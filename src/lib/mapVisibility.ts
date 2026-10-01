import { pagerPosition } from "@/lib/journeyPager";

/** Core emblem height as a fraction of the viewport height. */
export const EMBLEM_SCREEN_FRACTION = 0.06;

/** How far (in pages) either side of the overview stop the map layer reaches. */
const OVERVIEW_WINDOW = 0.65;

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/**
 * 0..1 strength of the journey's "system map" layer (orbit trails, core
 * emblem, name tags): full at the overview drone shot, gone by the first
 * planet stop. EVA overrides this itself.
 */
export function overviewStrength(): number {
  return smoothstep(1 - Math.abs(pagerPosition() - 1) / OVERVIEW_WINDOW);
}

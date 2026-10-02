import { services } from "@/data/services";
import { pagerPosition, PAGE_COUNT } from "@/lib/journeyPager";

/**
 * The journey's grand finale at the core. JourneyCaptions drives it, since
 * the scene syncs to its typing (the dock command sets off the shockwave,
 * each "[OK]" line lights that planet's orbit); the scene reads it, and
 * CoreFinale writes back the glow pulse. Same pattern as pagerState: a
 * plain mutable object polled every frame, never React state.
 */
export const finale = {
  /** ms the camera has sat settled on the core; 0 while away or in flight. */
  elapsed: 0,
  /** The dock command has printed: the shockwave goes off. */
  docked: false,
  /** Orbits lit by the systems check so far, 0..services.length. */
  lit: 0,
  /** A revisit (or reduced motion): show the finished state, no fanfare. */
  instant: false,
  /** 0..1 core glow pulse riding the shockwave, written by CoreFinale. */
  pulse: 0,
};

/** Length of the camera's slow push-in towards the core. */
export const FINALE_PUSH_MS = 7000;

/** Systems check order: a countdown from the outermost planet in to the
 *  core, so the orbits light up converging on it. */
export const FINALE_ORDER = [...services].sort((a, b) => b.index - a.index);

const CORE_PAGE = PAGE_COUNT - 1;
/** How far (in pages) either side of the core stop the finale layer reaches. */
const CORE_WINDOW = 0.8;

/** 0..1 strength of the finale layer: full at the core, gone a page out. */
export function coreStrength(): number {
  const t = Math.max(0, Math.min(1, 1 - Math.abs(pagerPosition() - CORE_PAGE) / CORE_WINDOW));
  return t * t * (3 - 2 * t);
}

/**
 * 0..1 hand-off into the finale layout (terminal centred under the core).
 * Starts only once the previous stop's text has faded out, so nothing
 * reflows while it is still readable.
 */
export function finaleLayout(): number {
  const t = Math.max(0, Math.min(1, (pagerPosition() - CORE_PAGE + 0.6) / 0.5));
  return t * t * (3 - 2 * t);
}

export function resetFinale() {
  finale.elapsed = 0;
  finale.docked = false;
  finale.lit = 0;
  finale.instant = false;
}

/** What this visitor did on the way in, for the finale's summary line.
 *  Module state, so it survives a trip to a service page and back. */
export const journeyLog = {
  /** performance.now() when they first left the hero; 0 until then. */
  startedAt: 0,
  /** performance.now() when they first reached the core; 0 until then. */
  finishedAt: 0,
  /** Service planets the camera has settled on. */
  scanned: new Set<string>(),
};

const pad = (n: number) => String(n).padStart(2, "0");

/** e.g. "PLANETS SCANNED 09/09 · TIME IN ORBIT 02:14". The clock stops at
 *  the first arrival, so coming back later reads the same. */
export function journeySummary(): string {
  const end = journeyLog.finishedAt || performance.now();
  const secs = journeyLog.startedAt ? Math.max(0, Math.round((end - journeyLog.startedAt) / 1000)) : 0;
  const time = `${pad(Math.min(99, Math.floor(secs / 60)))}:${pad(secs % 60)}`;
  return `PLANETS SCANNED ${pad(journeyLog.scanned.size)}/${pad(services.length)} · TIME IN ORBIT ${time}`;
}

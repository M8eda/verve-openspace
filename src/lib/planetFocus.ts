/**
 * Shared, non-React state for pointing at and focusing planets.
 *
 * - hover: which body the pointer is over right now (written by the 3D
 *   picker every pointer move, polled by DOM overlays in rAF loops).
 * - focus: which body EVA has flown to and opened a terminal for. Changes
 *   are rare and drive React UI, so it has subscribers.
 *
 * Ids are service slugs, or CORE_ID for the Verve core.
 */
export const CORE_ID = "verve-core";

export const planetHover: { id: string | null } = { id: null };

/** True while EVA's camera is flying to a focused body (polled per frame). */
export const evaFlight: { active: boolean } = { active: false };

type FocusListener = (id: string | null) => void;
let focusId: string | null = null;
let flightRequest = 0;
const focusListeners = new Set<FocusListener>();

export function getFocus(): string | null {
  return focusId;
}

/** Fly EVA's camera to a body and open its terminal (null clears it). */
export function focusBody(id: string | null): void {
  focusId = id;
  if (id) flightRequest++;
  focusListeners.forEach((l) => l(id));
}

/** Bumped on every focusBody(id) so the camera knows to start a new flight,
 *  even when the same body is picked twice. */
export function getFlightRequest(): number {
  return flightRequest;
}

export function subscribeFocus(fn: FocusListener): () => void {
  focusListeners.add(fn);
  return () => focusListeners.delete(fn);
}

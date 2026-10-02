"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { TERMINAL_STOPS, type TerminalStop } from "@/data/terminals";
import { BODIES } from "@/lib/bodies";
import { getBodyPosition } from "@/lib/planetPositions";
import { isFreeMode, subscribeFreeMode } from "@/lib/freeMode";
import { isContactOpen } from "@/lib/contactPanel";
import { pagerPosition, pagerState } from "@/lib/journeyPager";
import { jumpToPage } from "@/components/JourneyPager";
import { focusBody, planetHover } from "@/lib/planetFocus";
import { runTerminalAction } from "@/lib/terminalActions";
import { playGlassClick, playGlassHover } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";

/** Small or distant bodies still get a finger-sized hit area. */
const MIN_PICK_PX = 18;
/** A press that moves further than this is a drag (EVA orbit), not a click. */
const CLICK_SLOP_PX = 6;
/** Same window JourneyCaptions uses to decide a stop's screen is readable. */
const STOP_WINDOW = 0.42;

/** Anything the visitor can already click on its own wins over the scene. */
const UI_SELECTOR =
  "a, button, input, textarea, select, label, [role='dialog'], .terminal-bezel, .site-header, .eva-ui";

function isOverUi(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(UI_SELECTOR);
}

/** Journey stop the camera is parked at (or nearly), if any. */
function currentStop(): TerminalStop | null {
  const p = pagerPosition();
  let best: TerminalStop | null = null;
  let bestDist = Infinity;
  for (const stop of TERMINAL_STOPS) {
    const d = Math.abs(p - stop.param);
    if (d < bestDist) {
      bestDist = d;
      best = stop;
    }
  }
  return bestDist < STOP_WINDOW ? best : null;
}

function pickingEnabled(): boolean {
  if (isContactOpen()) return false;
  return isFreeMode() || currentStop() !== null;
}

/**
 * Makes the planets and the core clickable. The page layer (.content) sits
 * over the canvas and swallows pointer events, so instead of R3F's own
 * events this listens on the window and raycasts against simple spheres.
 *
 * - Journey: pointing at the stop's own planet arms its ENTER OPTION (see
 *   JourneyCaptions) and clicking runs it; any other body jumps the journey
 *   to that body's stop.
 * - EVA: clicking a body flies the camera there and opens its terminal.
 */
export default function PlanetPicker() {
  const router = useRouter();
  const { camera, gl } = useThree();
  const pointer = useRef({ x: 0, y: 0, inside: false, down: false, downX: 0, downY: 0, mouse: true });
  const scratch = useRef({
    raycaster: new THREE.Raycaster(),
    ndc: new THREE.Vector2(),
    center: new THREE.Vector3(),
    toCenter: new THREE.Vector3(),
  });
  const hovered = useRef<string | null>(null);
  const pickRef = useRef<{
    pick: (x: number, y: number) => string | null;
    setHover: (id: string | null) => void;
  } | null>(null);

  useEffect(() => {
    const setHover = (id: string | null) => {
      if (hovered.current === id) return;
      hovered.current = id;
      planetHover.id = id;
      document.documentElement.classList.toggle("planet-hover", id !== null);
      if (id) playGlassHover();
    };

    const pick = (clientX: number, clientY: number): string | null => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const { raycaster, ndc, center, toCenter } = scratch.current;
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const { origin, direction } = raycaster.ray;

      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 38;
      const pxPerUnit = rect.height / 2 / Math.tan(THREE.MathUtils.degToRad(fov) / 2);

      let best: string | null = null;
      let bestT = Infinity;
      for (const body of BODIES) {
        getBodyPosition(body.id, center);
        toCenter.subVectors(center, origin);
        const t = toCenter.dot(direction);
        if (t <= 0) continue;
        const missSq = toCenter.lengthSq() - t * t;
        const radius = Math.max(body.radius * 1.1, (MIN_PICK_PX * t) / pxPerUnit);
        if (missSq <= radius * radius && t < bestT) {
          bestT = t;
          best = body.id;
        }
      }
      return best;
    };

    const activate = (id: string) => {
      playGlassClick();
      if (isFreeMode()) {
        trackEvent("eva_fly_to", { target: id, source: "planet_click" });
        focusBody(id);
        return;
      }
      if (pagerState.locked) return;
      const stop = currentStop();
      if (stop && stop.bodyId === id && stop.options[0]) {
        trackEvent("service_planet_click", { service_slug: id, source: "journey" });
        runTerminalAction(stop.options[0].action, (href) => router.push(href), `journey_planet_${stop.param}`);
        return;
      }
      const target = TERMINAL_STOPS.find((s) => s.bodyId === id);
      if (target) {
        trackEvent("journey_planet_jump", { target: id });
        jumpToPage(target.param);
      }
    };

    const onMove = (e: PointerEvent) => {
      const p = pointer.current;
      p.x = e.clientX;
      p.y = e.clientY;
      p.mouse = e.pointerType === "mouse" || e.pointerType === "pen";
      p.inside = !isOverUi(e.target);
    };
    const onDown = (e: PointerEvent) => {
      const p = pointer.current;
      p.down = true;
      p.downX = e.clientX;
      p.downY = e.clientY;
    };
    const onUp = () => {
      pointer.current.down = false;
    };
    const onLeave = () => {
      pointer.current.inside = false;
      setHover(null);
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || isOverUi(e.target) || !pickingEnabled()) return;
      const p = pointer.current;
      if (Math.hypot(e.clientX - p.downX, e.clientY - p.downY) > CLICK_SLOP_PX) return;
      const id = pick(e.clientX, e.clientY);
      if (id) activate(id);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("click", onClick);
    document.documentElement.addEventListener("pointerleave", onLeave);
    const unsubscribeFree = subscribeFreeMode(() => setHover(null));

    pickRef.current = { pick, setHover };

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("click", onClick);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      unsubscribeFree();
      setHover(null);
      pickRef.current = null;
    };
  }, [camera, gl, router]);

  // Bodies move under a still pointer, so hover is re-tested every frame.
  useFrame(() => {
    const api = pickRef.current;
    if (!api) return;
    const p = pointer.current;
    if (!p.mouse || !p.inside || p.down || !pickingEnabled()) {
      api.setHover(null);
      return;
    }
    api.setHover(api.pick(p.x, p.y));
  });

  return null;
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_END, CAMERA_END_PUSH } from "@/lib/constants";
import { finale, finaleLayout, FINALE_PUSH_MS } from "@/lib/finale";
import { services } from "@/data/services";
import { getPlanetPosition } from "@/lib/planetPositions";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/device";
import { pagerPosition } from "@/lib/journeyPager";
import { isFreeMode } from "@/lib/freeMode";
import { getFocus } from "@/lib/planetFocus";
import { fixedOrbitTime, orbitAngle } from "@/lib/orbit";

const UP = new THREE.Vector3(0, 1, 0);
const WAYPOINT_COUNT = services.length + 2; // start + services + core
const CAMERA_CURVE_SEGMENTS = WAYPOINT_COUNT - 1;

const GALAXY_CAM_Y = 280;
const GALAXY_CAM_Z = 0;

/** Matches the CSS breakpoint where the journey terminal docks to the bottom. */
const STACKED_MAX_WIDTH = 768;
/** Lens shift (fraction of the viewport) that clears room for the terminal:
 *  rightward when it sits on the left, upward when it's docked below. */
const SIDE_SHIFT = 0.18;
const STACKED_SHIFT = 0.2;
/** At the core the terminal centres along the bottom (taller on mobile), so
 *  the shift turns upward to keep the core in the space above it. */
const FINALE_SHIFT = 0.28;
const FINALE_STACKED_SHIFT = 0.3;

/**
 * Overview "drone shot": a tilted aerial view of the whole system that
 * slowly circles it. The drone keeps pace with the first planet (plus a
 * gentle sway), so it orbits with the system and the hand-off to stop 01 is
 * always a short descent rather than a dive across the core.
 */
const DRONE_ELEVATION = THREE.MathUtils.degToRad(31);
/** System radius the overview tries to keep in frame (outermost orbit ~32). */
const DRONE_FRAME_RADIUS = 30;
/** Narrow screens crop the outer orbits rather than shrink planets to dots. */
const DRONE_STACKED_FRAME_RADIUS = 20;
const DRONE_MIN_DISTANCE = 64;
const DRONE_MAX_DISTANCE = 140;
const DRONE_STACKED_MAX_DISTANCE = 110;
/** Azimuth lead over the first planet, so it sits off-centre in the frame. */
const DRONE_LEAD = 0.55;
const FIRST_SERVICE = services[0];

function smoothstep(x: number) {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Off-centre projection so whatever the camera looks at renders beside the
 * journey (or EVA) terminal instead of behind it. `amount` is 0..1 and
 * `finaleMix` 0..1 blends into the finale layout. Only touches the
 * projection when the offset actually changes.
 */
function applyLensShift(
  camera: THREE.Camera,
  width: number,
  height: number,
  amount: number,
  finaleMix: number,
  last: { x: number; y: number; w: number; h: number },
) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;

  const stacked = width <= STACKED_MAX_WIDTH;
  const x = stacked ? 0 : Math.round(-width * SIDE_SHIFT * amount * (1 - finaleMix));
  const y = Math.round(
    height *
      amount *
      (stacked
        ? THREE.MathUtils.lerp(STACKED_SHIFT, FINALE_STACKED_SHIFT, finaleMix)
        : FINALE_SHIFT * finaleMix),
  );

  if (x === last.x && y === last.y && width === last.w && height === last.h) return;
  last.x = x;
  last.y = y;
  last.w = width;
  last.h = height;

  if (x === 0 && y === 0) {
    camera.clearViewOffset();
  } else {
    camera.setViewOffset(width, height, x, y, width, height);
  }
}

/** Camera distance that fits the system into the part of the frame the
 *  terminal leaves free, for the current aspect ratio. */
function droneDistance(aspect: number, fovDeg: number, stacked: boolean): number {
  const halfW = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2) * aspect;
  if (stacked) {
    return THREE.MathUtils.clamp(DRONE_STACKED_FRAME_RADIUS / halfW, DRONE_MIN_DISTANCE, DRONE_STACKED_MAX_DISTANCE);
  }
  // The lens shift leaves roughly the right 64% of the half-width free.
  return THREE.MathUtils.clamp(DRONE_FRAME_RADIUS / (halfW * 0.64), DRONE_MIN_DISTANCE, DRONE_MAX_DISTANCE);
}

export default function CameraRig() {
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const mobileFrame = useMemo(() => isCoarsePointer(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const skipParallax = reduceMotion || mobileFrame;

  const lensShift = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const lensAmount = useRef(0);
  const drone = useRef(new THREE.Vector3());
  const endDir = useMemo(
    () => new THREE.Vector3(CAMERA_END.dir.x, CAMERA_END.dir.y, CAMERA_END.dir.z).normalize(),
    [],
  );
  const push = useRef(0);
  const scratch = useRef({
    outward: new THREE.Vector3(),
    side: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
    camLook: new THREE.Vector3(),
  });

  // The curves keep references to their point arrays; useFrame rewrites the
  // points in place every frame as the planets move.
  const posCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: WAYPOINT_COUNT }, () => new THREE.Vector3()),
        false,
        "centripetal",
        0.25,
      ),
    [],
  );
  const lookCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: WAYPOINT_COUNT }, () => new THREE.Vector3()),
        false,
        "centripetal",
        0.25,
      ),
    [],
  );

  useEffect(() => {
    if (skipParallax) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [skipParallax]);

  useFrame((state, delta) => {
    const free = isFreeMode();
    const P = pagerPosition(); // 0..PAGE_COUNT-1 (0..12)
    const dt = Math.min(delta, 0.05);

    // In the journey the shift follows the terminal's own fade exactly; in
    // EVA it eases in while a planet terminal is open.
    const lensTarget = free ? (getFocus() ? 1 : 0) : smoothstep((P - 0.6) / 0.4);
    lensAmount.current =
      free && !reduceMotion ? THREE.MathUtils.damp(lensAmount.current, lensTarget, 5, dt) : lensTarget;
    applyLensShift(
      state.camera,
      state.size.width,
      state.size.height,
      lensAmount.current,
      free ? 0 : finaleLayout(),
      lensShift.current,
    );
    if (free) return;

    const stacked = state.size.width <= STACKED_MAX_WIDTH;
    const fov = state.camera instanceof THREE.PerspectiveCamera ? state.camera.fov : 38;
    const distance = droneDistance(state.size.width / state.size.height, fov, stacked);
    const clockT = reduceMotion ? fixedOrbitTime(FIRST_SERVICE) : state.clock.elapsedTime;
    const sway = reduceMotion ? 0 : Math.sin(clockT * 0.07) * 0.22;
    const azimuth = orbitAngle(FIRST_SERVICE, clockT) + DRONE_LEAD + sway;
    // Same handedness as orbitPointAt: x = cos(angle), z = sin(angle).
    const ground = Math.cos(DRONE_ELEVATION) * distance;
    const dronePos = drone.current.set(
      Math.cos(azimuth) * ground,
      Math.sin(DRONE_ELEVATION) * distance,
      Math.sin(azimuth) * ground,
    );

    if (P <= 1) {
      // Descend from the galaxy view straight into the drone orbit. The
      // heading blends from +z (what lookAt falls back to when looking
      // straight down) to the drone's, so the image never snaps its roll.
      const t = smoothstep(THREE.MathUtils.clamp(P, 0, 1));
      let hx = Math.cos(azimuth) * t;
      let hz = 1 - t + Math.sin(azimuth) * t;
      const hl = Math.hypot(hx, hz);
      if (hl < 1e-4) {
        hx = 0;
        hz = 1;
      } else {
        hx /= hl;
        hz /= hl;
      }
      const r = ground * t;
      state.camera.position.set(
        hx * r,
        THREE.MathUtils.lerp(GALAXY_CAM_Y, dronePos.y, t),
        GALAXY_CAM_Z + hz * r,
      );
      state.camera.lookAt(0, 0, 0);

      return;
    }

    const pos = posCurve.points;
    const look = lookCurve.points;

    pos[0].copy(dronePos);
    look[0].set(0, 0, 0);

    for (let k = 0; k < services.length; k++) {
      const s = services[k];
      const planet = getPlanetPosition(s.slug);

      // Planet rings extend the visible footprint beyond the sphere.
      // Use this for framing math instead of the bare sphere radius,
      // so service close-ups don't end up framed too tight.
      const effectiveRadius = s.visual.planetRadius * 1.6;

      const outward = scratch.current.outward.copy(planet).setY(0);
      if (outward.lengthSq() < 1e-6) outward.set(1, 0, 0);
      outward.normalize();
      const side = scratch.current.side.crossVectors(outward, UP).normalize();

      // Desktop shares the frame with the terminal now, so it backs off a
      // little further than a full-screen close-up would.
      const standoff = mobileFrame
        ? effectiveRadius * 3.9 + 1.9
        : effectiveRadius * 2.75 + 1.0;

      const verticalBias = mobileFrame
        ? effectiveRadius * 0.5 + 0.3 + Math.sin(s.index * 1.7) * 0.22
        : effectiveRadius * 0.45 + 0.18 + Math.sin(s.index * 1.7) * 0.22;

      pos[k + 1]
        .copy(planet)
        .addScaledVector(side, standoff)
        .addScaledVector(UP, verticalBias);

      // Always aim at the planet itself; applyLensShift moves it out from
      // behind the terminal on screen.
      look[k + 1].copy(planet);
    }

    // The finale: a wide shot of the core with the orbits around it, then a
    // slow push in while the visitor sits there. Eases back out on leaving.
    const pushTarget = reduceMotion ? 0 : smoothstep(finale.elapsed / FINALE_PUSH_MS);
    push.current = reduceMotion ? 0 : THREE.MathUtils.damp(push.current, pushTarget, 2, dt);
    const endDistance = (stacked ? CAMERA_END.stackedDistance : CAMERA_END.distance) - push.current * CAMERA_END_PUSH;
    pos[pos.length - 1].copy(endDir).multiplyScalar(endDistance);
    look[look.length - 1].set(0, 0, 0);

    // Map P across the service/core curve segments.
    const remapped = THREE.MathUtils.clamp((P - 1) / CAMERA_CURVE_SEGMENTS, 0, 1);

    const camPos = posCurve.getPoint(remapped, scratch.current.camPos);
    const camLook = lookCurve.getPoint(remapped, scratch.current.camLook);

    const ptr = pointer.current;
    if (reduceMotion) {
      ptr.sx = 0;
      ptr.sy = 0;
    } else {
      ptr.sx = THREE.MathUtils.damp(ptr.sx, ptr.x, 3, dt);
      ptr.sy = THREE.MathUtils.damp(ptr.sy, ptr.y, 3, dt);
    }

    state.camera.position.set(
      camPos.x + ptr.sx * 0.35,
      camPos.y + ptr.sy * 0.25,
      camPos.z,
    );
    state.camera.lookAt(camLook.x, camLook.y, camLook.z);
  });

  return null;
}

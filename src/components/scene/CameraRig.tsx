"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_END, CAMERA_START } from "@/lib/constants";
import { services } from "@/data/services";
import { getPlanetPosition } from "@/lib/planetPositions";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/device";
import { pagerPosition } from "@/lib/journeyPager";
import { isFreeMode } from "@/lib/freeMode";

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

function smoothstep(x: number) {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Off-centre projection so whatever the camera looks at renders beside the
 * journey terminal instead of behind it. Same 0..1 ramp as the terminal's
 * own fade, so the two move together. Only touches the projection when the
 * offset actually changes.
 */
function applyLensShift(
  camera: THREE.Camera,
  width: number,
  height: number,
  P: number,
  free: boolean,
  last: { x: number; y: number; w: number; h: number },
) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;

  const amount = free ? 0 : smoothstep((P - 0.6) / 0.4);
  const stacked = width <= STACKED_MAX_WIDTH;
  const x = stacked ? 0 : Math.round(-width * SIDE_SHIFT * amount);
  const y = stacked ? Math.round(height * STACKED_SHIFT * amount) : 0;

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

export default function CameraRig() {
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const mobileFrame = useMemo(() => isCoarsePointer(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const skipParallax = reduceMotion || mobileFrame;

  const posPoints = useRef<THREE.Vector3[]>(
    Array.from({ length: WAYPOINT_COUNT }, () => new THREE.Vector3()),
  );
  const lookPoints = useRef<THREE.Vector3[]>(
    Array.from({ length: WAYPOINT_COUNT }, () => new THREE.Vector3()),
  );
  const lensShift = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const scratch = useRef({
    outward: new THREE.Vector3(),
    side: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
    camLook: new THREE.Vector3(),
  });

  const posCurve = useMemo(
    () => new THREE.CatmullRomCurve3(posPoints.current, false, "centripetal", 0.25),
    [],
  );
  const lookCurve = useMemo(
    () => new THREE.CatmullRomCurve3(lookPoints.current, false, "centripetal", 0.25),
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
    applyLensShift(state.camera, state.size.width, state.size.height, P, free, lensShift.current);
    if (free) return;
    const dt = Math.min(delta, 0.05);

    if (P <= 1) {
      const t = smoothstep(THREE.MathUtils.clamp(P, 0, 1));

      const gy = THREE.MathUtils.lerp(GALAXY_CAM_Y, CAMERA_START.y, t);
      const gz = THREE.MathUtils.lerp(GALAXY_CAM_Z, CAMERA_START.z, t);

      state.camera.position.set(0, gy, gz);
      state.camera.lookAt(0, 0, 0);

      return;
    }

    const pos = posPoints.current;
    const look = lookPoints.current;

    pos[0].set(CAMERA_START.x, CAMERA_START.y, CAMERA_START.z);
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

    pos[pos.length - 1].set(CAMERA_END.x, CAMERA_END.y, CAMERA_END.z);
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

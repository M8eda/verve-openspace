"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { isFreeMode, subscribeFreeMode } from "@/lib/freeMode";
import { prefersReducedMotion } from "@/lib/device";
import { evaFlight, getFlightRequest, getFocus } from "@/lib/planetFocus";
import { getBody } from "@/lib/bodies";
import { getBodyPosition } from "@/lib/planetPositions";

/**
 * When EVA toggles on, we seed the OrbitControls target with a meaningful
 * pivot. Without this, OrbitControls defaults the target to (0,0,0), which
 * makes zoom always pull toward the galaxy core regardless of where the
 * camera is looking.
 *
 * The old approach used "8 units ahead of the camera", which put the pivot
 * in empty space when the camera was far away (home-page galaxy overview)
 * and PAST the planet when the camera was close (service waypoints) — so
 * zooming in felt like it did nothing, or flew you past the planet.
 *
 * New approach: place the target at the closest point on the camera's
 * forward ray to the origin. That lands it on the galaxy when framing from
 * far, and near the planet when framing a service waypoint.
 */
const MIN_PIVOT_DISTANCE = 0.5;
const MAX_PIVOT_DISTANCE = 500;

/** How far from a focused body the flight parks, in body radii (+ a margin). */
const FRAME_RADII = 3.2;
const FRAME_MARGIN = 1.2;
/** Minimum camera elevation (as a direction y component) when parking. */
const MIN_PARK_ELEVATION = 0.22;

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export default function FreeLookControls() {
  const [active, setActive] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const reduceMotion = prefersReducedMotion();
  const flight = useRef({
    req: 0,
    id: null as string | null,
    flying: false,
    start: 0,
    duration: 0,
    fromPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    body: new THREE.Vector3(),
    lastBody: new THREE.Vector3(),
    dest: new THREE.Vector3(),
  });

  useEffect(() => {
    setActive(isFreeMode());
    return subscribeFreeMode(setActive);
  }, []);

  useEffect(() => {
    if (!active || !controlsRef.current) return;
    const controls = controlsRef.current;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    // Closest approach of the camera's forward ray to the world origin.
    // t = -camPos · forward. If positive, the origin is ahead of the camera
    // (or nearly so), and this t gives the pivot at that closest point.
    const t = -camera.position.dot(forward);

    let pivotDistance: number;
    if (t > MIN_PIVOT_DISTANCE) {
      pivotDistance = Math.min(t, MAX_PIVOT_DISTANCE);
    } else {
      // Origin is behind the camera — fall back to a fixed forward distance
      // so we still get a sensible pivot in front of the user.
      pivotDistance = 8;
    }

    const target = camera.position.clone().addScaledVector(forward, pivotDistance);
    controls.target.copy(target);
    controls.update();
  }, [active, camera]);

  useEffect(() => {
    if (!active || !controlsRef.current || !reduceMotion) return;
    controlsRef.current.update();
  }, [active, reduceMotion]);

  // Flights to a focused body, then a soft lock that carries the camera
  // along with the planet's orbit. Runs just before OrbitControls updates
  // (drei uses priority -1), so dragging still orbits around the planet.
  useFrame(({ clock }) => {
    const controls = controlsRef.current;
    const f = flight.current;
    const focus = getFocus();
    const req = getFlightRequest();

    if (!controls || !focus) {
      f.req = req;
      if (f.id) {
        f.id = null;
        f.flying = false;
        evaFlight.active = false;
        if (controls) controls.enabled = true;
      }
      return;
    }

    if (req !== f.req || f.id !== focus) {
      const body = getBody(focus);
      if (!body) return;
      f.req = req;
      f.id = focus;
      getBodyPosition(focus, f.body);
      f.fromPos.copy(camera.position);
      f.fromTarget.copy(controls.target);

      // Park on the side we're already looking from, a little above it.
      const dir = f.offset.subVectors(camera.position, f.body);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0.3, 1);
      dir.normalize();
      dir.y = Math.max(dir.y, MIN_PARK_ELEVATION);
      dir.normalize().multiplyScalar(body.radius * FRAME_RADII + FRAME_MARGIN);

      const travel = f.fromPos.distanceTo(f.dest.addVectors(f.body, f.offset));
      f.duration = reduceMotion ? 0 : THREE.MathUtils.clamp(0.9 + travel / 70, 1.0, 2.4);
      f.start = clock.elapsedTime;
      f.flying = true;
      evaFlight.active = true;
      controls.enabled = false;
    }

    getBodyPosition(f.id, f.body);

    if (f.flying) {
      const u = f.duration > 0 ? Math.min(1, (clock.elapsedTime - f.start) / f.duration) : 1;
      const e = easeInOutCubic(u);
      // The aim settles a touch before the camera does, like a pilot
      // locking on and then closing the distance.
      const aim = easeInOutCubic(Math.min(1, u * 1.25));
      camera.position.lerpVectors(f.fromPos, f.dest.addVectors(f.body, f.offset), e);
      controls.target.lerpVectors(f.fromTarget, f.body, aim);
      camera.lookAt(controls.target);
      if (u >= 1) {
        f.flying = false;
        evaFlight.active = false;
        controls.enabled = true;
        f.lastBody.copy(f.body);
      }
      return;
    }

    // Docked: ride along with the body as it orbits.
    const dx = f.body.x - f.lastBody.x;
    const dy = f.body.y - f.lastBody.y;
    const dz = f.body.z - f.lastBody.z;
    camera.position.x += dx;
    camera.position.y += dy;
    camera.position.z += dz;
    controls.target.x += dx;
    controls.target.y += dy;
    controls.target.z += dz;
    f.lastBody.copy(f.body);
  }, -2);

  if (!active) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom
      enablePan
      enableRotate
      enableDamping={!reduceMotion}
      dampingFactor={reduceMotion ? 0 : 0.08}
      zoomSpeed={1.1}
      rotateSpeed={0.65}
      panSpeed={0.7}
      minDistance={0.5}
      maxDistance={600}
      screenSpacePanning
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { isFreeMode, subscribeFreeMode } from "@/lib/freeMode";
import { prefersReducedMotion } from "@/lib/device";

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

export default function FreeLookControls() {
  const [active, setActive] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const reduceMotion = prefersReducedMotion();

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

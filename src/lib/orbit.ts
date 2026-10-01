import type * as THREE from "three";
import type { Service } from "@/data/services";

/** Orbit angle (radians) of a planet at time t. */
export function orbitAngle(service: Service, t: number): number {
  return t * service.visual.orbitSpeed * 0.075 + service.index * 1.37;
}

/**
 * World position on a planet's tilted, slightly bobbing elliptical orbit at a
 * given angle. Planets, orbit trails and labels all go through this so they
 * can never drift apart.
 */
export function orbitPointAt(service: Service, angle: number, target: THREE.Vector3): THREE.Vector3 {
  const { index } = service;
  const { orbitRadius } = service.visual;
  const phase = index * 1.37;
  const ellipse = 0.74 + (index % 3) * 0.08;
  const inclination = Math.sin(index * 1.91) * 0.34;
  const x = Math.cos(angle) * orbitRadius;
  const flatZ = Math.sin(angle) * orbitRadius * ellipse;
  const y = Math.sin(angle + phase * 0.5) * orbitRadius * 0.1 + Math.sin(index * 2.2) * 0.8;
  return target.set(
    x,
    flatZ * Math.sin(inclination) + y * Math.cos(inclination),
    flatZ * Math.cos(inclination) - y * Math.sin(inclination),
  );
}

/** Time used for every orbit when reduced motion freezes the system. */
export function fixedOrbitTime(service: Service): number {
  return service.index * 5.25;
}

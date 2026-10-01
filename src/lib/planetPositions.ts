import * as THREE from "three";
import { CORE_ID } from "@/lib/planetFocus";

/**
 * Live world position of every planet, written every frame by Planet.tsx
 * and read every frame by CameraRig. A plain Map, not React state — the
 * camera path is rebuilt from these each frame, so no re-renders needed.
 */
export const planetPositions = new Map<string, THREE.Vector3>();

export function getPlanetPosition(slug: string): THREE.Vector3 {
  let v = planetPositions.get(slug);
  if (!v) {
    v = new THREE.Vector3();
    planetPositions.set(slug, v);
  }
  return v;
}

/** Live world position of any pickable body; the core sits at the origin. */
export function getBodyPosition(id: string, target: THREE.Vector3): THREE.Vector3 {
  if (id === CORE_ID) return target.set(0, 0, 0);
  return target.copy(getPlanetPosition(id));
}

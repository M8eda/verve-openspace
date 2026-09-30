import * as THREE from "three";

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

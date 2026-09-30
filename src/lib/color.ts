import * as THREE from "three";

/** #rrggbb -> THREE.Vector3 in linear space, for use as a shader uniform. */
export function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  c.convertSRGBToLinear();
  return new THREE.Vector3(c.r, c.g, c.b);
}

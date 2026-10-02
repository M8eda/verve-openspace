export const CORE_RADIUS = 1.6;

/** Half-size of the glow billboard, measured in core radii. */
export const GLOW_HALF = 7;

/**
 * Where the journey camera ends: pulled back far enough to see the whole
 * core with the inner orbits converging on it. `dir` is the viewing angle
 * (normalised in CameraRig); narrow screens stand further off.
 */
export const CAMERA_END = { dir: { x: 0, y: 0.42, z: 1 }, distance: 27, stackedDistance: 36 };
/** How much closer the slow finale push-in brings the camera. */
export const CAMERA_END_PUSH = 2.5;

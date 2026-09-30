/**
 * Shared, mutable scroll state.
 *
 * Read this inside useFrame / requestAnimationFrame loops.
 * NEVER put it in React state: updating state every frame re-renders the tree.
 */
export const scrollState = {
  /** 0 at the top of the page, 1 at the very bottom. */
  progress: 0,
  /** Lenis scroll velocity (px per frame-ish). Used later for star streaks. */
  velocity: 0,
};

/**
 * WebGL scene lifecycle, written by SceneRoot. A plain mutable object like
 * scrollState — polled from rAF loops (Loader), not React state.
 */
export const sceneReady = {
  /** True once the canvas has been created and rendered at least one frame. */
  ready: false,
  /** True if WebGL isn't supported, or the context was lost and didn't come back. */
  failed: false,
};

/**
 * Lightweight, client-only device detection. Used to pick a cheaper render
 * tier on phones (lower DPR, no antialias, simpler haze shader) and to skip
 * effects that don't apply under prefers-reduced-motion.
 *
 * Real touch hardware is the signal that matters here — devtools' mobile
 * *emulation* still runs on the desktop GPU, so it never exercises this
 * path. Only an actual phone/tablet GPU does.
 */

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

let weakGpuCache: boolean | null = null;

type ProbedWebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

function releaseWebGLContext(gl: ProbedWebGLContext | null): void {
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
}

export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return Math.min(window.innerWidth, window.innerHeight) <= 820;
}

/** True on phones/tablets where the heavy desktop render tier isn't safe. */
export function isMobileTier(): boolean {
  return isCoarsePointer() && isSmallViewport();
}

/**
 * True on any touch device regardless of viewport size. Catches tablets
 * that would otherwise miss isMobileTier() and get the full shader load.
 */
export function isTouchDevice(): boolean {
  return isCoarsePointer();
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cheap synchronous WebGL support probe. Doesn't guarantee a context won't
 * later fail or be lost (see contextlost handling in SceneRoot) — just
 * rules out browsers/devices that can't create one at all.
 */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return true;

  let gl: ProbedWebGLContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as ProbedWebGLContext | null);
    return !!gl;
  } catch {
    return false;
  } finally {
    releaseWebGLContext(gl);
  }
}

/**
 * Probes for hardware constraints that would make a full-fidelity render
 * immediately dangerous for battery or stability.
 */
export function isPotatoDevice(): boolean {
  if (typeof window === "undefined") return false;

  // navigator.deviceMemory is in GB
  const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory || 8;
  // navigator.hardwareConcurrency is logical CPU cores
  const cores = navigator.hardwareConcurrency || 8;

  // If we have under 4 cores OR under 4GB RAM, it's a weak tier
  return cores < 4 || memory < 4;
}

/**
 * Probes for a low-end GPU by checking max texture size and renderer string.
 */
export function isWeakGPU(): boolean {
  if (typeof window === "undefined") return false;
  if (weakGpuCache !== null) return weakGpuCache;

  let gl: ProbedWebGLContext | null = null;
  try {
    const c = document.createElement("canvas");
    gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) {
      weakGpuCache = true;
      return weakGpuCache;
    }

    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTex < 8192) {
      weakGpuCache = true;
      return weakGpuCache;
    }
    const coarsePointer = isCoarsePointer();
    if (!coarsePointer && isPotatoDevice()) {
      weakGpuCache = true;
      return weakGpuCache;
    }
    if (!coarsePointer) {
      weakGpuCache = false;
      return weakGpuCache;
    }

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbg) {
      weakGpuCache = false;
      return weakGpuCache;
    }
    const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase();

    // Legacy GPU families are weak regardless of any model number
    if (/powervr sgx|tegra/.test(renderer)) {
      weakGpuCache = true;
      return weakGpuCache;
    }

    // Qualcomm Adreno: parse the model number, not just the vendor name.
    // Current flagships (Snapdragon 8-series) run Adreno 730+.
    const adreno = renderer.match(/adreno.*?(\d{3,4})/);
    if (adreno) {
      weakGpuCache = parseInt(adreno[1], 10) < 640;
      return weakGpuCache;
    }

    // ARM Mali: parse the G-series number. Flagship Exynos/Dimensity
    // chips run Mali-G710/G715+; budget phones run G57 and below.
    const mali = renderer.match(/mali-g(\d{2,3})/);
    if (mali) {
      weakGpuCache = parseInt(mali[1], 10) < 68;
      return weakGpuCache;
    }

    // Apple GPU string covers the entire iPhone/iPad lineup and doesn't
    // encode a model number — don't blanket-flag it. maxTex and
    // isPotatoDevice above already catch genuinely old Apple hardware.
    weakGpuCache = false;
    return weakGpuCache;
  } catch {
    weakGpuCache = true;
    return weakGpuCache;
  } finally {
    releaseWebGLContext(gl);
  }
}

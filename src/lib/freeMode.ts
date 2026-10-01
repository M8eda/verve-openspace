import { pauseLenis, resumeLenis } from "@/components/SmoothScroll";
import { focusBody } from "@/lib/planetFocus";

type Listener = (open: boolean) => void;
let freeModeOpen = false;
const listeners = new Set<Listener>();

function setScenePointerEvents(enabled: boolean) {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".scene-root") as HTMLElement | null;
  if (!root) return;

  const nodes: HTMLElement[] = [root];
  // Walk down the DOM tree and set pointer-events on every element
  // until we hit the canvas. Handles R3F's intermediate wrapper div.
  const walk = (el: HTMLElement) => {
    nodes.push(el);
    if (el.tagName === "CANVAS") return;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      if (child instanceof HTMLElement) {
        walk(child);
        if (child.tagName === "CANVAS") break;
      }
    }
  };
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child instanceof HTMLElement) walk(child);
  }

  nodes.forEach((el) => {
    if (enabled) {
      el.style.pointerEvents = "auto";
      if (el.tagName === "CANVAS") {
        el.style.touchAction = "none";
      }
    } else {
      el.style.pointerEvents = "";
      if (el.tagName === "CANVAS") {
        el.style.touchAction = "";
      }
    }
  });
}

const EVA_TRIED_KEY = "verve:eva-tried";

/** False until the visitor has opened EVA once on this browser. */
export function hasTriedEva(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(EVA_TRIED_KEY) === "1";
  } catch {
    return true;
  }
}

function markEvaTried() {
  try {
    window.localStorage.setItem(EVA_TRIED_KEY, "1");
  } catch {
    // Private mode etc. — the pulse just keeps showing, which is harmless.
  }
}

export function isFreeMode(): boolean {
  return freeModeOpen;
}

export function openFreeMode(): void {
  if (freeModeOpen) return;
  freeModeOpen = true;
  markEvaTried();
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("free-mode");
    setScenePointerEvents(true);
  }
  pauseLenis();
  listeners.forEach((l) => l(true));
}

export function closeFreeMode(): void {
  if (!freeModeOpen) return;
  freeModeOpen = false;
  focusBody(null);
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("free-mode");
    setScenePointerEvents(false);
  }
  resumeLenis();
  listeners.forEach((l) => l(false));
}

export function toggleFreeMode(): void {
  if (freeModeOpen) closeFreeMode();
  else openFreeMode();
}

// EVA asked for from another page. The scene only exists on the home route,
// so the request waits until the home canvas is actually up.
let pendingOpen = false;

export function requestFreeModeOnHome(): void {
  pendingOpen = true;
}

export function cancelPendingFreeMode(): void {
  pendingOpen = false;
}

/** Opens EVA if a cross-page request is waiting. Returns whether it did. */
export function consumePendingFreeMode(): boolean {
  if (!pendingOpen) return false;
  pendingOpen = false;
  openFreeMode();
  return true;
}

export function subscribeFreeMode(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

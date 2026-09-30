import { pauseLenis, resumeLenis } from "@/components/SmoothScroll";

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

export function isFreeMode(): boolean {
  return freeModeOpen;
}

export function openFreeMode(): void {
  if (freeModeOpen) return;
  freeModeOpen = true;
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

export function subscribeFreeMode(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

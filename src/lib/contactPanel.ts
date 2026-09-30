import { trackEvent } from "@/lib/analytics";
import { lockPageScroll, unlockPageScroll } from "@/lib/scrollLock";

type Listener = (open: boolean) => void;
let isOpen = false;
const listeners = new Set<Listener>();
const CONTACT_SCROLL_LOCK = "contact-panel";

export function isContactOpen(): boolean {
  return isOpen;
}
export function openContactPanel(source = "unknown"): void {
  if (isOpen) return;
  isOpen = true;
  trackEvent("contact_open", { source });
  lockPageScroll(CONTACT_SCROLL_LOCK);
  listeners.forEach((l) => l(true));
}
export function closeContactPanel(): void {
  if (!isOpen) return;
  isOpen = false;
  unlockPageScroll(CONTACT_SCROLL_LOCK);
  listeners.forEach((l) => l(false));
}
export function subscribeContactPanel(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

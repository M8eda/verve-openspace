import { lockPageScroll, unlockPageScroll } from "@/lib/scrollLock";

type Listener = (open: boolean) => void;
let isOpen = false;
const listeners = new Set<Listener>();
const CONTACT_SCROLL_LOCK = "contact-panel";

export function isContactOpen(): boolean {
  return isOpen;
}
export function openContactPanel(): void {
  if (isOpen) return;
  isOpen = true;
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

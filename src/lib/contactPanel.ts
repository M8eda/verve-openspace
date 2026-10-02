import { trackEvent } from "@/lib/analytics";
import { lockPageScroll, unlockPageScroll } from "@/lib/scrollLock";

type Listener = (open: boolean) => void;
let isOpen = false;
/** Service slug the panel was opened for (a "Start project" button), if any. */
let openService: string | null = null;
const listeners = new Set<Listener>();
const CONTACT_SCROLL_LOCK = "contact-panel";

export function isContactOpen(): boolean {
  return isOpen;
}
export function contactService(): string | null {
  return openService;
}
export function openContactPanel(source = "unknown", service?: string): void {
  if (isOpen) return;
  isOpen = true;
  openService = service ?? null;
  trackEvent("contact_open", { source, service_slug: service });
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

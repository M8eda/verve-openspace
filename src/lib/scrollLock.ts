const activeLocks = new Set<string>();
let previousHtmlOverflow = "";
let previousBodyOverflow = "";

export function lockPageScroll(token: string): void {
  if (typeof document === "undefined") return;

  if (activeLocks.size === 0) {
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
  }

  activeLocks.add(token);
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

export function unlockPageScroll(token: string): void {
  if (typeof document === "undefined") return;

  activeLocks.delete(token);
  if (activeLocks.size > 0) return;

  document.documentElement.style.overflow = previousHtmlOverflow;
  document.body.style.overflow = previousBodyOverflow;
}

export function isPageScrollLocked(): boolean {
  return activeLocks.size > 0;
}

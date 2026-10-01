export const GA_MEASUREMENT_ID = "G-4NRQQHXF7X";

/** localStorage key holding the visitor's analytics choice. */
export const CONSENT_KEY = "verve:analytics-consent";

export type ConsentChoice = "granted" | "denied";

type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "consent",
      target: string,
      params?: AnalyticsParams,
    ) => void;
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export function trackPageView(path: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: path,
  });
}

/** The stored choice, or null if the visitor hasn't answered yet. */
export function getConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/** Remembers the choice and tells Google Analytics whether it may use cookies. */
export function setConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Private mode: the choice still applies for this page view.
  }
  window.gtag?.("consent", "update", { analytics_storage: choice });
}

type ConsentListener = () => void;
const consentListeners = new Set<ConsentListener>();

/** Re-opens the consent banner (from the "Cookie settings" link). */
export function openConsentSettings() {
  consentListeners.forEach((l) => l());
}

export function subscribeConsentSettings(fn: ConsentListener): () => void {
  consentListeners.add(fn);
  return () => consentListeners.delete(fn);
}

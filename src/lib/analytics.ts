export const GA_MEASUREMENT_ID = "G-4NRQQHXF7X";

type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config",
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

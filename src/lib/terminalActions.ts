import type { TerminalAction } from "@/data/terminals";
import { jumpToPage } from "@/components/JourneyPager";
import { pagerState } from "@/lib/journeyPager";
import { openFreeMode } from "@/lib/freeMode";
import { openContactPanel } from "@/lib/contactPanel";
import { trackEvent } from "@/lib/analytics";
import { focusBody } from "@/lib/planetFocus";

type Navigate = (href: string) => void;

/** Carries out a terminal option. `source` tags the analytics event. */
export function runTerminalAction(action: TerminalAction, navigate: Navigate, source: string): void {
  switch (action.type) {
    case "link":
      trackEvent("journey_caption_click", { target: action.href, source });
      navigate(action.href);
      return;
    case "next":
      trackEvent("journey_menu_begin", { source });
      jumpToPage(pagerState.index + 1);
      return;
    case "eva":
      trackEvent("eva_toggle", { state: "enter", source });
      openFreeMode();
      return;
    case "contact":
      openContactPanel(source);
      return;
    case "release":
      focusBody(null);
      return;
  }
}

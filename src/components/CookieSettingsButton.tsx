"use client";

import { openConsentSettings } from "@/lib/analytics";

/** Footer link that re-opens the consent banner. */
export default function CookieSettingsButton() {
  return (
    <button type="button" className="legal-links-button" onClick={openConsentSettings}>
      Cookie settings
    </button>
  );
}

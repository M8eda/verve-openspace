"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getConsent,
  setConsent,
  subscribeConsentSettings,
  type ConsentChoice,
} from "@/lib/analytics";

/**
 * First-visit analytics prompt, styled as a terminal readout. Google
 * Analytics starts with cookies denied (see the consent default in the root
 * layout) and only stores them after "Allow". The choice is remembered and
 * can be changed later from the "Cookie settings" link in the footer.
 */
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(getConsent() === null);
    return subscribeConsentSettings(() => setOpen(true));
  }, []);

  if (!open) return null;

  const choose = (choice: ConsentChoice) => {
    setConsent(choice);
    setOpen(false);
  };

  return (
    <section className="consent-banner" role="region" aria-label="Cookie consent">
      <p className="consent-title">
        <span aria-hidden="true">&gt; </span>analytics --consent
      </p>
      <p className="consent-copy">
        We&rsquo;d like to use Google Analytics cookies to see how visitors move
        through the system. Nothing is stored unless you allow it.{" "}
        <Link href="/privacy">Privacy Policy</Link>
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-button" onClick={() => choose("denied")}>
          [ Decline ]
        </button>
        <button type="button" className="consent-button consent-accept" onClick={() => choose("granted")}>
          [ Allow ]
        </button>
      </div>
    </section>
  );
}

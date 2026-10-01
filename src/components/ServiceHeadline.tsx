"use client";

import { useLayoutEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/device";

/** Pause after the boot line before the headline starts typing. */
const BOOT_DELAY_MS = 420;
const CHAR_MS = 42;

/**
 * Service page hero: a `> open planet <slug>` boot line, then the headline
 * typed out on the phosphor screen. The untyped remainder keeps its space
 * so the layout never shifts; the full name is always in the DOM for
 * screen readers and crawlers.
 */
export default function ServiceHeadline({ slug, name }: { slug: string; name: string }) {
  // Starts empty (space reserved) so a hard load never flashes the full
  // headline before hydration and then wipes it.
  const [typed, setTyped] = useState(0);
  const [typing, setTyping] = useState(false);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setTyped(name.length);
      return;
    }
    let count = 0;
    let interval = 0;
    setTyped(0);
    setTyping(true);
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        count += 1;
        setTyped(count);
        if (count >= name.length) {
          window.clearInterval(interval);
          setTyping(false);
        }
      }, CHAR_MS);
    }, BOOT_DELAY_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [name]);

  return (
    <>
      <p className="service-boot" aria-hidden="true">
        <span className="service-prompt">&gt;</span> open planet {slug}
      </p>
      <h1 className="service-headline">
        <span className="sr-only">{name}</span>
        <span aria-hidden="true">{name.slice(0, typed)}</span>
        <span className={`service-headline-cursor${typing ? " is-typing" : ""}`} aria-hidden="true" />
        <span className="service-headline-rest" aria-hidden="true">
          {name.slice(typed)}
        </span>
      </h1>
      <noscript>
        <style>{".service-headline-rest{visibility:visible}"}</style>
      </noscript>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import { playGlassClick, playGlassHover } from "@/lib/audio";
import { openContactPanel } from "@/lib/contactPanel";

export default function MissionControlButton({
  children,
  className,
  source = "mission_control_button",
  service,
}: {
  children: ReactNode;
  className: string;
  source?: string;
  /** Opens the terminal briefed for this service (slug). */
  service?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onMouseEnter={() => playGlassHover()}
      onClick={() => {
        playGlassClick();
        openContactPanel(source, service);
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { playGlassClick, playGlassHover } from "@/lib/audio";
import { openContactPanel } from "@/lib/contactPanel";

export default function MissionControlButton({
  children,
  className,
  source = "mission_control_button",
}: {
  children: string;
  className: string;
  source?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onMouseEnter={() => playGlassHover()}
      onClick={() => {
        playGlassClick();
        openContactPanel(source);
      }}
    >
      {children}
    </button>
  );
}

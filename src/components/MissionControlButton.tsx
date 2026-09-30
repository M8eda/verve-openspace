"use client";

import { playGlassClick, playGlassHover } from "@/lib/audio";
import { openContactPanel } from "@/lib/contactPanel";

export default function MissionControlButton({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onMouseEnter={() => playGlassHover()}
      onClick={() => {
        playGlassClick();
        openContactPanel();
      }}
    >
      {children}
    </button>
  );
}

import { services, type Service } from "@/data/services";
import { CORE_RADIUS } from "@/lib/constants";
import { CORE_ID } from "@/lib/planetFocus";

/**
 * Everything you can point at in the scene: the nine planets plus the core.
 * No three.js in here, so DOM overlays can import it cheaply; live positions
 * come from getBodyPosition() in planetPositions.ts.
 */
export type Body = {
  id: string;
  /** Visual radius including rings, used for picking and framing. */
  radius: number;
  color: string;
  service: Service | null;
};

export const BODIES: Body[] = [
  ...services.map((s) => ({
    id: s.slug,
    radius: s.visual.planetRadius * 1.6,
    color: s.visual.color,
    service: s,
  })),
  { id: CORE_ID, radius: CORE_RADIUS, color: "#cdf757", service: null },
];

const BY_ID = new Map(BODIES.map((b) => [b.id, b]));

export function getBody(id: string): Body | undefined {
  return BY_ID.get(id);
}

/** Two-digit map number: planets by service index, the core last. */
export function bodyNumber(body: Body): string {
  return String(body.service ? body.service.index : services.length + 1).padStart(2, "0");
}

export function bodyLabel(body: Body): string {
  return body.service ? body.service.shortName : "Verve core";
}

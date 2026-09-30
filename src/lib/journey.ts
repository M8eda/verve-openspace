import { services } from "@/data/services";

/** Extra scroll height (vh) dedicated to the galaxy zoom-in intro. */
export const GALAXY_VH = 250;

export const TOTAL_WAYPOINTS = services.length + 3; // services + hero(0) + overview(1) + core(last)

/** Roughly how much scroll (in vh) to give each journey waypoint. */
export const VH_PER_WAYPOINT = 115;

export const JOURNEY_VH = TOTAL_WAYPOINTS * VH_PER_WAYPOINT;

/** Total scroll runway including galaxy intro and journey. */
export const TOTAL_VH = GALAXY_VH + JOURNEY_VH;

/** Raw scroll progress (0..1) at which the galaxy phase ends and the
 *  camera journey begins. */
export const GALAXY_END_PARAM = GALAXY_VH / TOTAL_VH;

export type JourneyWaypoint = {
  id: string;
  index: number;
  label: string;
  code: string;
  tagline: string;
  param: number;
  slug?: string;
};

export const JOURNEY_WAYPOINTS: JourneyWaypoint[] = [
  {
    id: "home-hero",
    index: 0,
    label: "Home",
    code: "HERO",
    tagline: "Hero view & entry",
    param: 0,
  },
  {
    id: "system-overview",
    index: 1,
    label: "System Overview",
    code: "00 // ECOSYSTEM",
    tagline: "A cold, crowded space, pulled into your orbit",
    param: 1,
  },
  ...services.map((s, k) => ({
    id: s.slug,
    index: k + 2,
    label: s.name,
    code: `${String(s.index).padStart(2, "0")} // SERVICE`,
    tagline: s.tagline,
    param: k + 2,
    slug: s.slug,
  })),
  {
    id: "core-star",
    index: services.length + 2,
    label: "Verve Core",
    code: `${String(services.length + 1).padStart(2, "0")} // CORE`,
    tagline: "Arrival at system core & launchpad",
    param: services.length + 2,
  },
];

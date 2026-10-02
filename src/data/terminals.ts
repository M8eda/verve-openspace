import { services } from "./services";
import { CORE_ID } from "@/lib/planetFocus";
import { FINALE_ORDER } from "@/lib/finale";

/**
 * Copy for the journey terminal: one screen per pager stop (system
 * overview, each service planet, then the core). Lines are typed out in
 * order; `tag` is the permanent header label and is never typed, so it is
 * readable even when someone scrolls straight past a stop.
 *
 * - cmd:    a typed command, rendered with a "> " prompt
 * - meta:   dim status readout (dropped on the compact mobile layout)
 * - hi:     bright headline line
 * - out:    regular output
 * - prompt: dim closing note
 * - check:  one systems-check readout, printed in its planet's `color`
 */
export type TerminalLineKind = "cmd" | "meta" | "hi" | "out" | "prompt" | "check";

export type TerminalLine = {
  kind: TerminalLineKind;
  text: string;
  /** Overrides the screen's phosphor colour for this line. */
  color?: string;
};

/** What choosing a terminal option does. */
export type TerminalAction =
  | { type: "link"; href: string }
  | { type: "next" }
  | { type: "eva" }
  | { type: "contact" }
  /** EVA only: undock from the focused body and go back to free flight. */
  | { type: "release" };

export type TerminalOption = {
  label: string;
  action: TerminalAction;
};

export type TerminalStop = {
  /** Pager index this screen belongs to. */
  param: number;
  /** Permanent header label, e.g. "03 // SEO". */
  tag: string;
  /** Small header readout and bezel plate number. */
  sysId: string;
  /** 3D body this screen describes (service slug or CORE_ID), if any. */
  bodyId: string | null;
  /** Phosphor colour for this screen. */
  color: string;
  lines: TerminalLine[];
  /**
   * One option renders as a single "ENTER OPTION: [ LABEL ]" link; more than
   * one renders as a numbered menu that also answers to the number keys.
   */
  options: TerminalOption[];
  /**
   * "Scroll to continue" nudge once typing is done: "primary" blinks after
   * the visitor has sat idle for a few seconds, "subtle" is a dim footnote.
   */
  hint: "primary" | "subtle" | null;
};

const BRAND = "#cdf757";

const pad = (n: number) => String(n).padStart(2, "0");

/** One extra line per planet, printed under its tagline. */
const PLANET_COPY: Record<string, string> = {
  "branding-strategy":
    "Who you are, who you're for, and why you win. A fixed point the whole operation steers by.",
  "ui-ux-design":
    "Research-led, accessible interfaces. Nobody should need a manual to navigate what we build.",
  "web-development":
    "Bespoke builds that load at light speed, rank where it matters, and turn visitors into customers.",
  "mobile-apps":
    "One codebase, both stores. Backend, auth, and payments wired in from ignition.",
  seo: "We fix what drags you down, then build authority that keeps pulling traffic into your orbit.",
  "digital-marketing":
    "Every frequency your audience is tuned into, measured against signals that move revenue.",
  "paid-advertising":
    "Tight targeting, sharp creative, relentless optimisation. No spend drifts into the void.",
  "email-marketing":
    "Sequences that nurture leads, recover carts, and turn one-time buyers into loyal crew.",
  "cloud-devops-infrastructure":
    "Cloud, CI/CD, and automated deploys that hold steady through any traffic spike.",
};

const coreIndex = services.length + 1;

export const TERMINAL_STOPS: TerminalStop[] = [
  {
    param: 1,
    tag: "00 // System overview",
    sysId: "SYS ID:00",
    bodyId: null,
    color: BRAND,
    lines: [
      { kind: "cmd", text: "connect verve.system" },
      { kind: "meta", text: `LINK ESTABLISHED · ${services.length} PLANETS · 1 CORE` },
      { kind: "hi", text: "Hello, visitor." },
      {
        kind: "out",
        text: "The internet is a vast space. What were the odds you'd drift into ours?",
      },
      { kind: "out", text: "We're glad you did. Choose how you'd like to travel." },
    ],
    options: [
      { label: "Begin journey", action: { type: "next" } },
      { label: "EVA · Free roam", action: { type: "eva" } },
      { label: "Contact", action: { type: "contact" } },
    ],
    hint: "primary",
  },
  ...services.map((s, k) => ({
    param: k + 2,
    tag: `${pad(s.index)} // ${s.name}`,
    sysId: `SYS ID:${pad(s.index)}`,
    bodyId: s.slug,
    color: s.visual.color,
    lines: [
      { kind: "cmd" as const, text: `scan --planet ${s.slug}` },
      {
        kind: "meta" as const,
        text: `SIGNAL LOCKED · ORBIT ${s.visual.orbitRadius.toFixed(1)} AU`,
      },
      { kind: "hi" as const, text: s.tagline },
      { kind: "out" as const, text: PLANET_COPY[s.slug] ?? s.description },
    ],
    options: [{ label: "Explore planet", action: { type: "link" as const, href: `/services/${s.slug}` } }],
    hint: "subtle" as const,
  })),
  {
    param: services.length + 2,
    tag: `${pad(coreIndex)} // Verve core`,
    sysId: `SYS ID:${pad(coreIndex)}`,
    bodyId: CORE_ID,
    color: BRAND,
    // The grand finale. A systems check counts the planets in from the
    // outermost orbit, and each [OK] lights that orbit in the scene.
    // JourneyCaptions appends the visitor's own journey summary.
    lines: [
      { kind: "cmd", text: "dock --core" },
      { kind: "meta", text: `SYSTEMS CHECK · ${services.length} PLANETS · 1 CORE` },
      ...FINALE_ORDER.map((s) => ({
        kind: "check" as const,
        text: `[OK] ${pad(s.index)} ${s.shortName.toUpperCase()}`,
        color: s.visual.color,
      })),
      { kind: "hi", text: "All orbits converge here." },
      {
        kind: "out",
        text: "Every planet you just passed is one system, run from this core. Tell us where you're headed and we'll plot the course.",
      },
    ],
    options: [
      { label: "Open mission control", action: { type: "link", href: "/core" } },
      { label: "EVA · Free roam", action: { type: "eva" } },
    ],
    hint: null,
  },
];

/** Screen shown in EVA once the camera has docked at a body. */
export type EvaScreen = Pick<TerminalStop, "tag" | "sysId" | "color" | "lines" | "options">;

export function evaScreen(id: string): EvaScreen | null {
  if (id === CORE_ID) {
    return {
      tag: `${pad(coreIndex)} // Verve core`,
      sysId: `SYS ID:${pad(coreIndex)}`,
      color: BRAND,
      lines: [
        { kind: "cmd", text: "dock --core" },
        { kind: "meta", text: "EVA LINK · ALL ORBITS CONVERGE HERE" },
        { kind: "hi", text: "Verve core online." },
        { kind: "out", text: "Mission control runs the whole system from here. Tell us where you're headed." },
      ],
      options: [
        { label: "Open mission control", action: { type: "link", href: "/core" } },
        { label: "Contact", action: { type: "contact" } },
        { label: "Undock", action: { type: "release" } },
      ],
    };
  }

  const s = services.find((service) => service.slug === id);
  if (!s) return null;
  return {
    tag: `${pad(s.index)} // ${s.name}`,
    sysId: `SYS ID:${pad(s.index)}`,
    color: s.visual.color,
    lines: [
      { kind: "cmd", text: `dock --planet ${s.slug}` },
      { kind: "meta", text: `EVA LINK · ORBIT ${s.visual.orbitRadius.toFixed(1)} AU` },
      { kind: "hi", text: s.tagline },
      { kind: "out", text: PLANET_COPY[s.slug] ?? s.description },
    ],
    options: [
      { label: "Explore planet", action: { type: "link", href: `/services/${s.slug}` } },
      { label: "Undock", action: { type: "release" } },
    ],
  };
}

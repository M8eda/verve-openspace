import { services } from "./services";

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
 * - prompt: dim closing hint
 */
export type TerminalLineKind = "cmd" | "meta" | "hi" | "out" | "prompt";

export type TerminalLine = {
  kind: TerminalLineKind;
  text: string;
};

export type TerminalStop = {
  /** Pager index this screen belongs to. */
  param: number;
  /** Permanent header label, e.g. "03 // SEO". */
  tag: string;
  /** Small header readout and bezel plate number. */
  sysId: string;
  /** Phosphor colour for this screen. */
  color: string;
  lines: TerminalLine[];
  link: { href: string; label: string } | null;
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
    color: BRAND,
    lines: [
      { kind: "cmd", text: "connect verve.system" },
      { kind: "meta", text: `LINK ESTABLISHED · ${services.length} PLANETS · 1 CORE` },
      { kind: "hi", text: "Hello, visitor." },
      {
        kind: "out",
        text: "The internet is a vast space. What were the odds you'd drift into ours?",
      },
      { kind: "out", text: "We're glad you did. Explore our planets, and travel safe." },
      { kind: "prompt", text: `Next stop: ${pad(1)} // ${services[0].name}` },
    ],
    link: null,
  },
  ...services.map((s, k) => ({
    param: k + 2,
    tag: `${pad(s.index)} // ${s.name}`,
    sysId: `SYS ID:${pad(s.index)}`,
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
    link: { href: `/services/${s.slug}`, label: "Explore planet" },
  })),
  {
    param: services.length + 2,
    tag: `${pad(coreIndex)} // Verve core`,
    sysId: `SYS ID:${pad(coreIndex)}`,
    color: BRAND,
    lines: [
      { kind: "cmd", text: "dock --core" },
      { kind: "meta", text: "ALL ORBITS CONVERGE HERE" },
      { kind: "hi", text: "Verve core online." },
      {
        kind: "out",
        text: "Every planet connects back to this point. Mission control is ready when you are.",
      },
    ],
    link: { href: "/core", label: "Open mission control" },
  },
];

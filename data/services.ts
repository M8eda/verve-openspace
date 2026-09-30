export type ServiceStep = {
  title: string;
  description: string;
};

export type Service = {
  slug: string;
  index: number;
  name: string;
  /** One line under the planet's name in the flyby caption. */
  tagline: string;
  /** Landing-page intro paragraph. */
  description: string;
  benefits: string[];
  process: ServiceStep[];
  deliverables: string[];
  /** Planet visual identity — orbit + procedural surface. */
  visual: {
    color: string;
    accent: string;
    /** Orbit radius in core radii; spacing decided by the full list below. */
    orbitRadius: number;
    orbitSpeed: number;
    /** Planet radius in core radii. */
    planetRadius: number;
    /** Surface character, read by the planet shader in milestone 2. */
    surface: "rocky" | "banded" | "cloudy" | "crystalline" | "metallic" | "oceanic" | "volcanic" | "glass";
    hasRing: boolean;
  };
};

export const services: Service[] = [
  {
    slug: "web-development",
    index: 1,
    name: "Web Development",
    tagline: "Fast, bespoke websites built to convert.",
    description:
      "We build websites that load instantly, rank well, and turn visitors into customers. No bloated templates — every site is hand-built with clean code, accessible markup, and a CMS your team can actually use.",
    benefits: [
      "Sub-second load times and 95+ Lighthouse scores",
      "Conversion-focused UX with clear calls to action",
      "SEO foundations built in from the first line of code",
      "A headless CMS non-developers can publish from",
    ],
    process: [
      { title: "Discovery", description: "Goals, audience, and a sitemap that earns its keep." },
      { title: "Design", description: "High-fidelity, on-brand interfaces and prototypes." },
      { title: "Build", description: "An accessible, component-driven front end." },
      { title: "Launch", description: "QA, analytics, and a fast, monitored go-live." },
    ],
    deliverables: [
      "Custom responsive website",
      "CMS integration",
      "Analytics and tracking setup",
      "Performance and SEO report",
    ],
    visual: {
      color: "#4fd1ff",
      accent: "#bfeeff",
      orbitRadius: 12,
      orbitSpeed: 1,
      planetRadius: 0.62,
      surface: "crystalline",
      hasRing: false,
    },
  },
  {
    slug: "mobile-apps",
    index: 2,
    name: "Mobile App Development",
    tagline: "One codebase, native feel, both stores.",
    description:
      "From first prototype to a live App Store and Play Store listing, we ship cross-platform apps with a native feel in a fraction of the usual timeline, without leaving you with a codebase nobody can maintain.",
    benefits: [
      "One codebase for both iOS and Android",
      "Native performance and platform-correct UI patterns",
      "Rapid MVP-to-launch timelines",
      "Backend, authentication, and payments wired in from day one",
    ],
    process: [
      { title: "Scope", description: "A feature map, user flows, and a realistic roadmap." },
      { title: "Prototype", description: "A clickable build to validate before we scale." },
      { title: "Develop", description: "Rapid builds, with custom code where it matters most." },
      { title: "Ship", description: "Store submission, release management, and support." },
    ],
    deliverables: [
      "iOS and Android applications",
      "Backend and API integration",
      "App store submission",
      "Maintenance and release plan",
    ],
    visual: {
      color: "#8f7bff",
      accent: "#d8ccff",
      orbitRadius: 17,
      orbitSpeed: 0.82,
      planetRadius: 0.5,
      surface: "metallic",
      hasRing: true,
    },
  },
  {
    slug: "seo",
    index: 3,
    name: "SEO",
    tagline: "Technical, on-page, and content SEO that compounds.",
    description:
      "We fix what's holding your rankings back, target the keywords that actually convert, and build the kind of authority that keeps paying off long after the project ends.",
    benefits: [
      "Higher rankings for high-intent keywords",
      "Technical fixes that unblock crawling and indexation",
      "Content that earns links and organic traffic",
      "Transparent reporting tied back to revenue",
    ],
    process: [
      { title: "Audit", description: "A technical, content, and backlink deep dive." },
      { title: "Strategy", description: "A keyword map prioritised by intent and value." },
      { title: "Execute", description: "On-page, technical, and content rollout." },
      { title: "Grow", description: "Iterate on the data, expand what's working." },
    ],
    deliverables: [
      "Technical SEO audit",
      "Keyword and content strategy",
      "On-page optimisation",
      "Monthly ranking reports",
    ],
    visual: {
      color: "#6dffb0",
      accent: "#d4ffe6",
      orbitRadius: 22,
      orbitSpeed: 0.68,
      planetRadius: 0.58,
      surface: "banded",
      hasRing: false,
    },
  },
  {
    slug: "digital-marketing",
    index: 4,
    name: "Digital Marketing",
    tagline: "Full-funnel campaigns across every channel.",
    description:
      "We plan, create, launch, and optimise full-funnel campaigns that find your audience where they already are, measured the whole way against the metrics that actually move your business.",
    benefits: [
      "A channel mix tuned to your audience",
      "Creative built to stop the scroll",
      "Continuous A/B testing and optimisation",
      "One dashboard covering every channel",
    ],
    process: [
      { title: "Plan", description: "Audience, channels, budget, and KPIs." },
      { title: "Create", description: "Copy and creative built to perform." },
      { title: "Launch", description: "A multi-channel rollout with tracking in place." },
      { title: "Optimise", description: "Double down on winners, cut what isn't working." },
    ],
    deliverables: [
      "Campaign strategy and calendar",
      "Creative and copy production",
      "Multi-channel management",
      "Performance dashboard",
    ],
    visual: {
      color: "#ff9d5c",
      accent: "#ffdcb8",
      orbitRadius: 27,
      orbitSpeed: 0.57,
      planetRadius: 0.68,
      surface: "cloudy",
      hasRing: false,
    },
  },
  {
    slug: "paid-advertising",
    index: 5,
    name: "Paid Advertising",
    tagline: "Every dollar accountable.",
    description:
      "We structure, launch, and manage paid campaigns built to maximise return: tight targeting, sharp creative, and constant optimisation toward the cost-per-acquisition that makes the numbers work.",
    benefits: [
      "Lower CPA through constant optimisation",
      "Pixel and conversion tracking done properly",
      "Retargeting that closes the loop",
      "Clear ROAS reporting",
    ],
    process: [
      { title: "Setup", description: "Accounts, tracking, and audience research." },
      { title: "Build", description: "Campaign structure and ad creative." },
      { title: "Scale", description: "Bid strategy and budget scaling." },
      { title: "Report", description: "ROAS, CPA, and clear next steps." },
    ],
    deliverables: [
      "Google and Meta ad campaigns",
      "Conversion tracking",
      "Retargeting funnels",
      "ROAS reporting",
    ],
    visual: {
      color: "#ff5c7a",
      accent: "#ffc2ce",
      orbitRadius: 32,
      orbitSpeed: 0.49,
      planetRadius: 0.55,
      surface: "volcanic",
      hasRing: false,
    },
  },
  {
    slug: "email-marketing",
    index: 6,
    name: "Email Marketing",
    tagline: "Still the highest-ROI channel, done right.",
    description:
      "We build automated journeys that nurture leads, recover abandoned carts, and turn one-time buyers into loyal customers, all wired directly into your CRM.",
    benefits: [
      "Automated journeys that run around the clock",
      "Segmentation for genuinely relevant messaging",
      "CRM-integrated lead nurturing",
      "Deliverability and list health, taken care of",
    ],
    process: [
      { title: "Map", description: "Lifecycle stages and trigger points." },
      { title: "Design", description: "On-brand templates and sequences." },
      { title: "Automate", description: "Flows, segments, and CRM sync." },
      { title: "Refine", description: "Optimise for opens, clicks, and revenue." },
    ],
    deliverables: [
      "Automation and journey setup",
      "Email template system",
      "CRM integration",
      "Performance reporting",
    ],
    visual: {
      color: "#5cc9ff",
      accent: "#c3ecff",
      orbitRadius: 37,
      orbitSpeed: 0.43,
      planetRadius: 0.46,
      surface: "oceanic",
      hasRing: false,
    },
  },
  {
    slug: "branding-strategy",
    index: 7,
    name: "Branding & Strategy",
    tagline: "Clarity, before tactics.",
    description:
      "Before any tactics, we define who you are, who you're for, and why you win, then translate that clarity into an identity and a roadmap the whole team can rally behind.",
    benefits: [
      "Distinct positioning in a crowded market",
      "A cohesive identity across every touchpoint",
      "A growth roadmap with real priorities",
      "Messaging that actually sticks",
    ],
    process: [
      { title: "Research", description: "Market, competitors, and audience." },
      { title: "Position", description: "Story, values, and value proposition." },
      { title: "Identity", description: "Logo, visual system, and guidelines." },
      { title: "Roadmap", description: "A phased plan for sustainable growth." },
    ],
    deliverables: [
      "Brand strategy and positioning",
      "Visual identity system",
      "Brand guidelines",
      "Growth roadmap",
    ],
    visual: {
      color: "#d6b3ff",
      accent: "#efe0ff",
      orbitRadius: 42,
      orbitSpeed: 0.38,
      planetRadius: 0.6,
      surface: "glass",
      hasRing: true,
    },
  },
  {
    slug: "ui-ux-design",
    index: 8,
    name: "UI/UX Design",
    tagline: "Interfaces people genuinely enjoy using.",
    description:
      "We design products people love to use: research-led, accessible, and considered, with interfaces that reduce friction, lift conversion, and feel effortless on every device.",
    benefits: [
      "Research-driven, user-tested decisions",
      "Accessible by default, to WCAG standards",
      "Design systems that scale with you",
      "Prototypes that de-risk the build",
    ],
    process: [
      { title: "Research", description: "Users, jobs-to-be-done, and flows." },
      { title: "Wireframe", description: "Structure and interaction, first." },
      { title: "Design", description: "High-fidelity UI and components." },
      { title: "Prototype", description: "Test, iterate, and hand off clean." },
    ],
    deliverables: [
      "UX research and wireframes",
      "High-fidelity UI design",
      "Interactive prototype",
      "Design system and handoff",
    ],
    visual: {
      color: "#ffe066",
      accent: "#fff6cc",
      orbitRadius: 47,
      orbitSpeed: 0.34,
      planetRadius: 0.64,
      surface: "rocky",
      hasRing: false,
    },
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

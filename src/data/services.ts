export type ServiceStep = {
  title: string;
  description: string;
};

export type Service = {
  slug: string;
  index: number;
  name: string;
  tagline: string;
  description: string;
  benefits: string[];
  process: ServiceStep[];
  deliverables: string[];
  visual: {
    color: string;
    accent: string;
    orbitRadius: number;
    orbitSpeed: number;
    planetRadius: number;
    surface:
      | "rocky"
      | "banded"
      | "cloudy"
      | "crystalline"
      | "metallic"
      | "oceanic"
      | "volcanic"
      | "glass"
      | "accessible"
      | "performance"
      | "mobile"
      | "seo"
      | "marketing"
      | "ads"
      | "email"
      | "cloud";
    hasRing: boolean;
  };
};

export const services: Service[] = [
  {
    slug: "branding-strategy",
    index: 1,
    name: "Branding & Strategy",
    tagline: "Your north star. Locked in.",
    description:
      "Before tactics, clarity. We define who you are, who you're for, and why you win, then translate that into an identity and a roadmap your whole crew can navigate by. No moodboard fluff. A fixed point the entire operation orients around.",
    benefits: [
      "Distinct positioning in a crowded market",
      "Cohesive identity across every touchpoint",
      "A growth roadmap with real priorities",
      "Messaging that lands and sticks",
    ],
    process: [
      { title: "Research", description: "Market, competitors, and audience." },
      { title: "Position", description: "Story, values, and value proposition." },
      { title: "Identity", description: "Logo, system, and guidelines." },
      { title: "Roadmap", description: "Phased plan for sustainable growth." },
    ],
    deliverables: [
      "Brand strategy and positioning",
      "Visual identity system",
      "Brand guidelines",
      "Growth roadmap",
    ],
    visual: { color: "#d6b3ff", accent: "#efe0ff", orbitRadius: 8.5, orbitSpeed: 1.18, planetRadius: 0.78, surface: "glass", hasRing: true },
  },
  {
    slug: "ui-ux-design",
    index: 2,
    name: "UI/UX Design",
    tagline: "Interfaces that feel weightless.",
    description:
      "We design products people love to use. Research-led, accessible, and unmistakable: interfaces that strip away friction, lift conversion, and feel effortless on every device. No one should need a manual to navigate what we build.",
    benefits: [
      "Research-driven, user-tested decisions",
      "Accessible by default, WCAG-compliant",
      "Design systems that scale with your ambition",
      "Prototypes that de-risk the build before a line ships",
    ],
    process: [
      { title: "Research", description: "Users, jobs-to-be-done, and flows." },
      { title: "Wireframe", description: "Structure and interaction, first." },
      { title: "Design", description: "High-fidelity UI and component library." },
      { title: "Prototype", description: "Test, iterate, and hand off clean." },
    ],
    deliverables: [
      "UX research and wireframes",
      "High-fidelity UI design",
      "Interactive prototype",
      "Design system and handoff",
    ],
    visual: { color: "#ffcf33", accent: "#7dd3fc", orbitRadius: 11.4, orbitSpeed: 1.04, planetRadius: 0.8, surface: "accessible", hasRing: true },
  },
  {
    slug: "web-development",
    index: 3,
    name: "Web Development",
    tagline: "Built for velocity. Engineered to convert.",
    description:
      "We design and build high-performance websites that load at light speed, rank where it matters, and turn visitors into customers. Every build is bespoke: no bloated templates orbiting your brand. Clean code, accessible markup, and a CMS your crew can pilot without us.",
    benefits: [
      "Sub-second load times and 95+ Lighthouse scores",
      "Conversion-focused UX with zero dead weight",
      "SEO architecture baked in from the first commit",
      "Headless CMS so your team can publish on their own",
    ],
    process: [
      { title: "Discovery", description: "Goals, audience, and a sitemap that earns its coordinates." },
      { title: "Design", description: "High-fidelity, on-brand interfaces and prototypes." },
      { title: "Build", description: "Next.js front-end, accessible and component-driven." },
      { title: "Launch", description: "QA, analytics, and a fast, monitored liftoff." },
    ],
    deliverables: [
      "Custom responsive website",
      "CMS integration",
      "Analytics and tracking setup",
      "Performance and SEO report",
    ],
    visual: { color: "#00f0ff", accent: "#ff4fd8", orbitRadius: 14.3, orbitSpeed: 0.92, planetRadius: 0.78, surface: "performance", hasRing: true },
  },
  {
    slug: "mobile-apps",
    index: 4,
    name: "Mobile App Development",
    tagline: "One mission. Two platforms. Zero compromise.",
    description:
      "From prototype to orbit, we ship cross-platform mobile apps with native feel and a fraction of the usual timeline. One codebase deploys to both App Store and Play Store: backend, auth, and payments wired in from ignition.",
    benefits: [
      "One codebase powering iOS and Android",
      "Native performance and platform-correct UI",
      "Rapid MVP-to-launch trajectory",
      "Backend, auth, and payments operational from day one",
    ],
    process: [
      { title: "Scope", description: "Feature map, user flows, and a realistic flight plan." },
      { title: "Prototype", description: "Clickable build to validate before we scale." },
      { title: "Develop", description: "Rapid iteration with custom code where it counts." },
      { title: "Ship", description: "Store submission, release management, and support." },
    ],
    deliverables: [
      "iOS and Android applications",
      "Backend and API integration",
      "App store submission",
      "Maintenance and release plan",
    ],
    visual: { color: "#9b5cff", accent: "#4dff88", orbitRadius: 17.2, orbitSpeed: 0.74, planetRadius: 0.66, surface: "mobile", hasRing: true },
  },
  {
    slug: "seo",
    index: 5,
    name: "SEO",
    tagline: "Rise in the rankings. Stay in orbit.",
    description:
      "Technical, on-page, and content SEO that compounds over time. We fix what's dragging you down, target keywords that actually convert, and build the kind of authority that keeps pulling traffic into your gravitational field month after month.",
    benefits: [
      "Higher rankings for high-intent keywords",
      "Technical fixes that unblock crawl and indexation",
      "Content that earns links and sustainable traffic",
      "Transparent reporting tied to revenue, not vanity metrics",
    ],
    process: [
      { title: "Audit", description: "Technical, content, and backlink deep-dive." },
      { title: "Strategy", description: "Keyword map prioritised by intent and value." },
      { title: "Execute", description: "On-page, technical, and content rollout." },
      { title: "Compound", description: "Iterate on data. Expand what's already working." },
    ],
    deliverables: [
      "Technical SEO audit",
      "Keyword and content strategy",
      "On-page optimisation",
      "Monthly ranking reports",
    ],
    visual: { color: "#31ff7a", accent: "#faff5a", orbitRadius: 20.1, orbitSpeed: 0.69, planetRadius: 0.72, surface: "seo", hasRing: true },
  },
  {
    slug: "digital-marketing",
    index: 6,
    name: "Digital Marketing",
    tagline: "Full-spectrum coverage. Every channel locked in.",
    description:
      "Full-funnel campaigns that reach your audience across every frequency they're tuned into. We plan, create, launch, and optimise across every major channel, always measuring against the signals that matter to your bottom line, not vanity dashboards.",
    benefits: [
      "Channel mix calibrated to your audience",
      "Creative that cuts through the noise",
      "Continuous A/B testing and optimisation",
      "One dashboard tracking every channel",
    ],
    process: [
      { title: "Plan", description: "Audience, channels, budget, and KPIs." },
      { title: "Create", description: "Copy and creative engineered to perform." },
      { title: "Launch", description: "Multi-channel rollout with precision tracking." },
      { title: "Optimise", description: "Amplify the winners. Cut the dead weight." },
    ],
    deliverables: [
      "Campaign strategy and calendar",
      "Creative and copy production",
      "Multi-channel management",
      "Performance dashboard",
    ],
    visual: { color: "#ff7a18", accent: "#ff2bd6", orbitRadius: 23.0, orbitSpeed: 0.62, planetRadius: 0.82, surface: "marketing", hasRing: true },
  },
  {
    slug: "paid-advertising",
    index: 7,
    name: "Paid Advertising",
    tagline: "Every dollar tracked. Every return maximised.",
    description:
      "We structure, launch, and manage paid campaigns built to maximise return on every unit of fuel you put in. Tight targeting, sharp creative, and relentless optimisation toward the cost-per-acquisition that makes the math work. No spend drifts into the void.",
    benefits: [
      "Lower CPA through constant optimisation",
      "Pixel and conversion tracking done right",
      "Retargeting that closes the loop",
      "Clear, honest ROAS reporting",
    ],
    process: [
      { title: "Setup", description: "Accounts, tracking, and audience research." },
      { title: "Build", description: "Campaign structure and ad creative." },
      { title: "Scale", description: "Bid strategy and controlled budget acceleration." },
      { title: "Report", description: "ROAS, CPA, and next-step recommendations." },
    ],
    deliverables: [
      "Google and Meta ad campaigns",
      "Conversion tracking",
      "Retargeting funnels",
      "ROAS reporting",
    ],
    visual: { color: "#ff2e63", accent: "#ffd166", orbitRadius: 25.9, orbitSpeed: 0.53, planetRadius: 0.7, surface: "ads", hasRing: true },
  },
  {
    slug: "email-marketing",
    index: 8,
    name: "Email Marketing",
    tagline: "Automated signals. Always transmitting.",
    description:
      "Email is still the highest-ROI channel, when the signal is right. We build automated sequences that nurture leads, recover abandoned carts, and turn one-time buyers into loyal customers, all wired into your CRM and transmitting around the clock.",
    benefits: [
      "Automated journeys running 24/7",
      "Segmentation for relevant, targeted messaging",
      "CRM-integrated lead nurturing",
      "Deliverability and list health, handled",
    ],
    process: [
      { title: "Map", description: "Lifecycle stages and trigger points." },
      { title: "Design", description: "On-brand templates and sequences." },
      { title: "Automate", description: "Flows, segments, and CRM sync." },
      { title: "Refine", description: "Open, click, and revenue optimisation." },
    ],
    deliverables: [
      "Automation and journey setup",
      "Email template system",
      "CRM integration",
      "Performance reporting",
    ],
    visual: { color: "#2dd4bf", accent: "#f472b6", orbitRadius: 28.8, orbitSpeed: 0.46, planetRadius: 0.62, surface: "email", hasRing: true },
  },
  {
    slug: "cloud-devops-infrastructure",
    index: 9,
    name: "Cloud & DevOps Infrastructure",
    tagline: "Scalable architecture. Zero downtime.",
    description:
      "The system only pulls if it never goes dark. Enterprise-grade cloud infrastructure, CI/CD pipelines, and automated deployments engineered to scale effortlessly through any traffic spike your growth throws at it.",
    benefits: [
      "99.99% uptime reliability",
      "Automated CI/CD pipelines",
      "Enterprise security and compliance",
      "Auto-scaling serverless architecture",
    ],
    process: [
      { title: "Architect", description: "Cloud infrastructure design and security audit." },
      { title: "Automate", description: "CI/CD pipeline setup and containerisation." },
      { title: "Deploy", description: "Zero-downtime migration and launch." },
      { title: "Monitor", description: "24/7 telemetry and automated alerts." },
    ],
    deliverables: [
      "Cloud architecture setup",
      "Automated CI/CD pipelines",
      "Infrastructure as Code (IaC)",
      "Monitoring and alert dashboard",
    ],
    visual: { color: "#38bdf8", accent: "#a78bfa", orbitRadius: 31.7, orbitSpeed: 0.40, planetRadius: 0.75, surface: "cloud", hasRing: true },
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

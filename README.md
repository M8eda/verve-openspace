<div align="center">
  <img src="./public/icon.svg" alt="Verve logo" width="84" />

  <h1>Verve</h1>

  <p><strong>A cinematic digital agency website where services orbit like planets.</strong></p>

  <p>
    <a href="https://verve-marketing.space/">Live Site</a>
    ·
    <a href="https://verve-marketing.space/core">The Core</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=fff" alt="TypeScript strict" />
    <img src="https://img.shields.io/badge/Three.js-WebGL-000?logo=threedotjs" alt="Three.js WebGL" />
  </p>
</div>

> Own your space.

## Overview

Verve is a production Next.js agency website that turns a service menu into an interactive space system. The homepage is a scroll-driven 3D journey: every service is represented as an orbiting planet, the visitor advances through terminal-style mission screens, and the final stop docks at the Verve Core.

The experience also includes normal crawlable service pages, legal routes, metadata, analytics consent, direct social/contact links, and a server-side contact endpoint that sends project briefs through SMTP.

## Current experience

- **Scroll-driven galaxy journey** with a full-screen WebGL scene, typed terminal captions, scroll/swipe navigation, keyboard support, and a finale at the Verve Core.
- **Nine service planets** generated from structured service content, each with its own colour, orbit, copy, service page, questions, and shader style.
- **EVA / free-roam mode** for manual exploration. Visitors can leave the guided journey, fly around the 3D system, click planets, open EVA terminal screens, and undock back to free flight.
- **HUD timeline navigation** for moving between mission points without relying only on scrolling.
- **Service detail pages** for every offer, statically generated from `src/data/services.ts`, with benefits, process, deliverables, JSON-LD, and a service-aware Start project CTA.
- **Mission Control contact terminal** with typed boot copy, service chips, optional service-specific questions, budget chips, message field, optional phone number, and direct channel shortcuts.
- **Real email delivery** through `/api/contact` using Nodemailer and SMTP, with mail-app fallback if SMTP is not configured.
- **Production support layers**: SEO metadata, Open Graph/Twitter cards, sitemap, robots.txt, structured data, legal pages, Google Analytics consent mode, WebGL fallback, reduced-motion paths, weak-device render settings, and accessible fallback service content.

## Services represented

1. Branding & Strategy
2. UI/UX Design
3. Web Development
4. Mobile App Development
5. SEO
6. Digital Marketing
7. Paid Advertising
8. Email Marketing
9. Cloud & DevOps Infrastructure

The canonical source for service content is `src/data/services.ts`. Each service defines:

- `slug`, `name`, `shortName`, `tagline`, and `description`
- benefits, process steps, and deliverables
- visual metadata used by the 3D scene: colour, accent, orbit radius/speed, planet radius, surface type, and ring state

## Journey and EVA system

The home route combines React DOM UI with a deferred React Three Fiber canvas.

### Guided journey

- `JourneyPager` controls the scroll/swipe/keyboard pager state.
- `JourneyCaptions` renders the glass terminal, typed copy, choices, hints, the finale checklist, and the final Core CTA.
- `TERMINAL_STOPS` in `src/data/terminals.ts` maps each pager stop to terminal copy, colour, 3D body focus, and actions.
- Terminal choices are rendered as glass buttons by `src/lib/terminalTyper.ts` and support mouse, touch, and keyboard number selection.

### EVA / free-roam mode

- The header exposes **EVA · Free roam** and remembers whether the visitor has tried it.
- `src/lib/freeMode.ts` toggles free mode, pauses Lenis, enables canvas pointer events, and supports opening EVA from non-home routes after returning home.
- `FreeLookControls`, `PlanetPicker`, and `PlanetTags` let visitors navigate manually, click bodies, dock at planets/core, and open service pages.
- EVA terminal screens reuse the same service copy and action model as the guided journey.

## 3D and visual system

The WebGL scene lives only on the homepage and is loaded only after a route and capability check.

- `SceneRoot` checks WebGL support and device tier before mounting the canvas.
- `SceneCanvas` handles context loss/restoration, delays rendering until shader warmup, and marks the scene ready for the loader.
- `Scene` composes the galaxy, haze, starfields, planets, Verve Core, finale effects, trails, tags, picking, and postprocessing.
- Device safeguards adjust DPR, antialiasing, star counts, postprocessing, and animation intensity for mobile, weak GPU, or reduced-motion users.
- If WebGL is unavailable or the context fails, `SceneFallback` keeps the site usable.

## Mission Control contact flow

The contact form is a terminal-styled modal available from the header, journey terminal options, the Core page, and each service page's Start project button.

### Form fields

- Name (required)
- Email (required)
- Phone (optional)
- Service chips (optional, but at least a service or a message is required)
- Service-specific questions when services are selected
- Budget chips
- Message
- Invisible anti-abuse field

Service-specific questions live in `src/data/missionBriefs.ts`. The brief text is composed by `src/lib/missionBrief.ts`, which is shared between the client fallbacks and the server endpoint so all channels use the same mission format.

### Email delivery

`POST /api/contact` sends mail through Nodemailer:

1. A project brief to `CONTACT_TO`, with `Reply-To` set to the visitor's email.
2. A short optional confirmation email to the visitor after the response is sent.

The confirmation email intentionally repeats only the visitor's first name, mission ID, and selected services, so the form cannot be abused to send arbitrary visitor-written content to another inbox.

### Server-side checks and anti-spam

The endpoint includes:

- required-field checks for name/email and either a message or selected service
- email format validation
- optional phone validation
- maximum lengths for every submitted field
- option whitelisting for service questions and budget
- lightweight invisible anti-abuse checks
- basic request throttling

If SMTP is not configured, the API returns unavailable and the client falls back to the visitor's mail app with a prefilled brief. If sending fails, the draft is kept and the form shows direct email/phone/WhatsApp fallback actions.

## Environment variables

Create local environment variables from `.env.example` when testing SMTP locally. In production, set the same variables in the hosting provider's environment settings.

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=465
SMTP_USER=sender@your-domain.com
SMTP_PASS=<smtp password>
CONTACT_TO=inbox@your-domain.com
CONTACT_CONFIRM=on
```

Notes:

- `SMTP_PASS` must never be committed.
- `CONTACT_TO` defaults to `SMTP_USER` when omitted.
- Set `CONTACT_CONFIRM=off` to disable the visitor confirmation email.
- SPF, DKIM, and DMARC should be healthy with the mail provider so messages do not land in spam.

## SEO, analytics, and legal

- Root metadata, service metadata, canonical URLs, Open Graph cards, Twitter cards, sitemap, and robots are managed through the App Router.
- Organization, WebSite, and Service JSON-LD are generated from `src/lib/seo.ts` and `src/data/services.ts`.
- Official social profiles are defined once in `src/lib/seo.ts` and reused in JSON-LD, the contact terminal, and footer links.
- Google Analytics is loaded only in production and only reports from the live domain.
- Analytics starts with consent denied; `ConsentBanner` lets visitors allow or decline, and legal footers expose Cookie settings.
- `/privacy` and `/terms` are first-class routes.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Main cinematic journey with the WebGL service system. |
| `/core` | Verve positioning, beliefs, and primary Mission Control CTA. |
| `/services/[slug]` | Static service detail pages generated from `src/data/services.ts`. |
| `/api/contact` | Server-side contact endpoint for Mission Control briefs. |
| `/privacy` | Privacy Policy. |
| `/terms` | Terms of Use. |
| `/sitemap.xml` | Generated sitemap. |
| `/robots.txt` | Generated robots file. |

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js App Router 16 |
| UI | React 19 |
| Language | TypeScript |
| 3D | Three.js, React Three Fiber, Drei |
| Effects | React Three Postprocessing, Postprocessing, custom GLSL shaders |
| Motion / scroll | Lenis + custom journey pager and frame loop |
| Styling | Global CSS with CSS variables and responsive media queries |
| Email | Nodemailer over SMTP |
| Analytics | Google Analytics consent mode |
| Testing / QA | TypeScript, ESLint, Playwright smoke tests |

## Local development

### Requirements

- Node.js 20.9+
- npm

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional local SMTP setup

Copy `.env.example` to `.env.local` and fill the SMTP values if you want `/api/contact` to send real emails locally:

```bash
cp .env.example .env.local
```

If SMTP values are missing, the contact form still works by falling back to a prefilled `mailto:` handoff.

### Production build

```bash
npm run build
npm run start
```

### Verification commands

```bash
npm run typecheck
npm run lint
npm run build
npm run test:smoke
```

`npm run check` runs all of the above in sequence, including the Playwright smoke tests.

## Project structure

```txt
src/
  app/                  App Router pages, metadata, legal routes, sitemap, robots, API routes
    api/contact/        Nodemailer contact endpoint
    core/               Core/about page
    privacy/            Privacy policy
    services/[slug]/    Static service detail pages
    terms/              Terms of use
  components/           UI, contact modal, header, loader, journey controls, scene shell
  components/scene/     3D scene objects, planets, controls, picking, labels, finale
  data/                 Service content, terminal stops, mission brief questions
  lib/                  Shared utilities: analytics, SEO, contact state, journey state, terminal engine
  shaders/              GLSL shader sources for planets, galaxy, haze, stars, core, rings
public/                 Icons, manifest assets, and social share image
docs/                   README screenshot and documentation assets
```

## Important source files

| File | Purpose |
| --- | --- |
| `src/data/services.ts` | Source of truth for the nine services and their visuals. |
| `src/data/terminals.ts` | Guided journey and EVA terminal copy/actions. |
| `src/data/missionBriefs.ts` | Contact form budget options and per-service questions. |
| `src/lib/missionBrief.ts` | Shared brief validation limits and email/WhatsApp text composition. |
| `src/app/api/contact/route.ts` | SMTP contact endpoint, validation, confirmation, and spam guards. |
| `src/components/ContactForm.tsx` | Mission Control modal UI and client-side submit flow. |
| `src/components/JourneyPager.tsx` | Scroll, swipe, and keyboard pager logic. |
| `src/components/JourneyCaptions.tsx` | Typed terminal overlay for the guided journey. |
| `src/lib/terminalTyper.ts` | DOM terminal typing engine and option renderer. |
| `src/components/scene/Scene.tsx` | Main R3F scene composition and performance controls. |
| `src/lib/seo.ts` | Site constants, social links, metadata helpers, and JSON-LD. |

## Deployment notes

The live site is deployed at `https://verve-marketing.space/`.

For Node-compatible deployments:

- Build command: `npm run build`
- Package manager: `npm`
- Output directory: `.next`
- Environment variables: set the SMTP values listed above
- After changing environment variables, redeploy so the server route receives them

## Status

The site is production-ready and currently includes the full cinematic journey, EVA exploration, static service pages, legal/SEO/analytics layers, social contact links, and SMTP-backed Mission Control contact flow.

## License

No open-source license is currently provided.

© 2026 Verve. All rights reserved.

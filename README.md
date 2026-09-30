# Verve Website

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=fff)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-000?logo=threedotjs)
![React Three Fiber](https://img.shields.io/badge/React%20Three%20Fiber-3D-7c3aed)
![CI](https://github.com/M8eda/verve-openspace/actions/workflows/ci.yml/badge.svg)

A cinematic agency website where Verve's services become a scroll-driven solar system. Visitors enter through a galaxy, fly past nine service planets, and arrive at the Verve Core: the central call to action for starting a project.

Built with **Next.js**, **React 19**, **React Three Fiber**, **Three.js**, **Lenis**, and custom **GLSL shaders**.

> Own your space.

## Live site

[https://verve-marketing.space/](https://verve-marketing.space/)

## Screenshot

![Verve homepage hero with a scroll-driven 3D galaxy system](./public/screenshot-home.png)

## Table of contents

- [Live site](#live-site)
- [Screenshot](#screenshot)
- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Routes](#routes)
- [Services](#services)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Architecture notes](#architecture-notes)
- [Accessibility](#accessibility)
- [Performance and resilience](#performance-and-resilience)
- [Debugging](#debugging)
- [Deployment](#deployment)
- [Caveats](#caveats)
- [License](#license)

## Overview

Verve is a digital agency site built around the idea of market gravity. Instead of a conventional landing page, the homepage is an interactive space journey: every service is a planet, every flyby reveals a concise value proposition, and the final destination is Mission Control.

The app keeps one persistent WebGL canvas mounted at the root and drives the camera through a sequence of waypoints. The surrounding UI layers provide navigation, captions, CTAs, contact flow, accessibility fallbacks, and low-power rendering safeguards.

## Features

- **Scroll-driven 3D journey** through an interactive service system powered by React Three Fiber and Three.js.
- **Nine procedural service planets** generated from structured service data, each with custom colors, shaders, rings, captions, and static detail pages.
- **Mission timeline navigation** for jumping between the hero, ecosystem overview, service flybys, and the Verve Core.
- **EVA/free-look mode** for orbiting, panning, and zooming around the scene.
- **Mission Control contact modal** available across the experience with a prefilled email handoff.
- **First-paint loader** that waits for WebGL readiness or fallback state instead of leaving visitors on a blank screen.
- **WebGL fallback path** for unsupported browsers or unrecoverable context loss.
- **Responsive render tiers** for mobile and weaker GPUs.
- **Accessibility-minded UI** with semantic content, keyboard support, focus states, ARIA dialog semantics, live captions, and reduced-motion handling.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js App Router 16 |
| UI runtime | React 19 / React DOM 19 |
| Language | TypeScript with `strict` mode |
| 3D rendering | Three.js, `@react-three/fiber`, `@react-three/drei` |
| Post-processing | `@react-three/postprocessing`, `postprocessing` |
| Scroll behavior | Lenis |
| Styling | Global CSS in `src/app/globals.css` |
| Package manager | npm |
| Path alias | `@/*` -> `src/*` |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Main scroll-driven space journey with hero, service flybys, captions, timeline, and optional debug HUD. |
| `/core` | The Verve Core page: agency positioning, mission narrative, and CTA. |
| `/services/[slug]` | Static service detail pages generated from `src/data/services.ts`. |

## Services

The service system is generated from `src/data/services.ts`:

1. **Branding & Strategy** — `/services/branding-strategy`
2. **UI/UX Design** — `/services/ui-ux-design`
3. **Web Development** — `/services/web-development`
4. **Mobile App Development** — `/services/mobile-apps`
5. **SEO** — `/services/seo`
6. **Digital Marketing** — `/services/digital-marketing`
7. **Paid Advertising** — `/services/paid-advertising`
8. **Email Marketing** — `/services/email-marketing`
9. **Cloud & DevOps Infrastructure** — `/services/cloud-devops-infrastructure`

Each service defines its page copy, benefits, process, deliverables, orbit data, colors, radius, ring behavior, and planet surface style from a single source of truth.

## Getting started

### Prerequisites

- Node.js **20.9 or newer**
- npm

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For reproducible installs in CI or deployment environments, use:

```bash
npm ci
```

### Environment variables

No environment variables are required for the current app. The contact form opens the visitor's email client with a prefilled `mailto:` link.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install project dependencies. |
| `npm run dev` | Start the local Next.js development server. |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | Run TypeScript checking with `tsc --noEmit`. |

## Project structure

```text
src/
  app/
    layout.tsx                 # Root shell, metadata, persistent scene/header/contact
    page.tsx                   # Home journey page
    core/page.tsx              # Verve Core page
    services/[slug]/page.tsx   # Static service detail pages
    globals.css                # Global styling and responsive UI
  components/
    Header.tsx
    ContactForm.tsx
    JourneyPager.tsx
    JourneyTimeline.tsx
    JourneyCaptions.tsx
    Loader.tsx
    SceneRoot.tsx
    SceneFallback.tsx
    MissionControlButton.tsx
    scene/
      Scene.tsx
      CameraRig.tsx
      Planet.tsx
      EcosystemPlanet.tsx
      VerveCore.tsx
      Galaxy.tsx
      Starfield.tsx
      Haze.tsx
      FreeLookControls.tsx
  data/
    services.ts                # Service content and planet visual data
  lib/
    audio.ts
    contactPanel.ts            # Contact modal state
    device.ts                  # WebGL/device/reduced-motion checks
    freeMode.ts                # EVA/free-look mode state
    journey.ts                 # Waypoint definitions
    journeyPager.ts            # Mutable pager state
    scrollLock.ts
    scrollState.ts             # Mutable scene/scroll state
  shaders/
    *.ts                       # GLSL shader sources
public/
  icon.svg
  assets/                      # GLTF/bin/texture asset library and experiments
```

## Architecture notes

- The app gates the React Three Fiber `<Canvas>` from `SceneRoot`, mounting it only on the home route after WebGL support has been probed.
- Per-frame values live in plain mutable objects such as `scrollState`, `sceneReady`, and `pagerState`, then get read from `useFrame` or the shared frame loop. Avoid putting per-frame scene state in React state.
- Service content and planet visual identity live in `src/data/services.ts`.
- The 3D scene is mostly procedural: galaxy geometry, starfields, haze, planets, rings, and the Verve Core are shader/geometry driven rather than texture-heavy.
- Non-home routes do not mount the canvas or fallback, so service/core pages avoid loading or rendering the 3D bundle.
- Lenis smooths the home-page journey and writes scroll progress for the scene/UI layers.

## Accessibility

The WebGL scene is backed by semantic service content for non-visual users, while EVA/free-look labels remain accessible when they become interactive. The contact panel is implemented as an ARIA modal with focus trapping and Escape-to-close behavior. Keyboard, wheel, touch, and clickable timeline navigation are supported, and the UI respects `prefers-reduced-motion`.

Notable accessibility details:

- Focus-visible styles for interactive controls.
- Descriptive timeline button labels and current-step state.
- `aria-live` captions for scroll-synced updates.
- Reduced transitions and animation behavior for visitors who prefer reduced motion.
- CSS/WebGL fallback content when the 3D scene cannot render.

## Performance and resilience

The scene includes mobile and weak-GPU safeguards so the experience can degrade gracefully instead of failing hard:

- Adaptive device-pixel-ratio settings by render tier.
- Lower-cost rendering on genuinely weak GPUs while keeping capable mobile devices visually close to desktop.
- Reduced star counts and cheaper haze quality tiers where needed.
- Post-processing gated off for low-power devices and reduced-motion preferences.
- WebGL support probing before rendering, with probe contexts released immediately.
- WebGL context lost/restored handling with a fallback path.
- First-paint loading state tied to scene readiness or fallback state.
- Dynamic scene import and route gating so simple pages do not load or render the 3D scene.

## Debugging

Append `?debug` to the homepage URL to show a lightweight scroll/FPS readout:

```text
http://localhost:3000/?debug
```

## Deployment

This is a standard Next.js app and should deploy cleanly to platforms that support Next.js, such as Vercel. The current live site is [verve-marketing.space](https://verve-marketing.space/).

### Production build

```bash
npm run build
npm run start
```

### Recommended Vercel settings

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output | Managed by Next.js/Vercel |
| Environment variables | None currently required |

## Verification

Before opening a PR or deploying:

```bash
npm run typecheck
npm run build
```

## Caveats

- The contact form currently uses a `mailto:` handoff rather than a backend submission endpoint.
- There are no test or lint scripts yet; `npm run typecheck` is the current static verification command.
- The app includes WebGL fallback handling, but real-device mobile GPU testing is still recommended before production launch.
- `public/assets` contains GLTF/bin assets that are not currently referenced by the active scene code.

## License

No license file is currently included. Add a license before distributing or accepting external contributions.

import type { Metadata } from "next";
import MissionControlButton from "@/components/MissionControlButton";
import { defaultOgImage, siteName } from "@/lib/seo";

const title = "The Core — About Verve";
const description =
  "Meet Verve, the digital agency that builds brand, web, and growth systems your market orbits. Strategy, creative, platform, and performance under one roof.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: "/core",
  },
  openGraph: {
    type: "website",
    url: "/core",
    siteName,
    title,
    description,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [defaultOgImage],
  },
};

export default function CorePage() {
  return (
    <article className="core-page">
      <header className="core-hero">
        <span className="core-eyebrow">THE CORE</span>
        <h1>Every system needs a source.</h1>
        <p>
          Verve is ours. The energy at the center, the thing your market ends up
          orbiting.
        </p>
      </header>

      <section className="core-block">
        <h2>We build systems, not deliverables.</h2>
        <p>
          Most agencies hand you a planet and wave goodbye: a logo here, a
          campaign there, a site that drifts off into the dark six months later.
          We build the whole system. Brand, platform, and growth, engineered to
          pull together instead of apart, with one crew accountable for whether
          the numbers actually move. You don&rsquo;t get vendors. You get a center of
          gravity.
        </p>
      </section>

      <section className="core-block">
        <h2>Markets are cold, dark, and crowded.</h2>
        <p>
          Every brand starts as a rock in the void: burning budget, chasing
          vanity metrics, invisible in the noise. What separates the ones that
          break out isn&rsquo;t more motion. It&rsquo;s force. Enough energy at the core to
          bend attention into orbit and turn a market into a system with your
          name on the sun. That force has a name. It&rsquo;s the one on the door.
        </p>
      </section>

      <section className="core-block">
        <h2>Ignite. Pull. Sustain.</h2>
        <p>Everything we do is one of three forces acting on your market.</p>
        <ul className="core-force-list">
          <li>
            <strong>Ignite.</strong> We light it up. The identity, the platform,
            the product: the machine that makes you worth orbiting in the first
            place.
          </li>
          <li>
            <strong>Pull.</strong> We make the market come to you. Search,
            campaigns, and paid firepower that bend attention out of the noise
            and into your gravity.
          </li>
          <li>
            <strong>Sustain.</strong> We keep it running. Lifecycle, retention,
            and infrastructure that keep customers circling and the whole system
            compounding, never going dark.
          </li>
        </ul>
      </section>

      <section className="core-block">
        <h2>How we fly.</h2>
        <ul className="core-beliefs">
          <li>
            <strong>Strategy before templates.</strong> We start from your goals
            and unit economics, never a pre-baked layout.
          </li>
          <li>
            <strong>Beauty is the baseline.</strong> Looking good is table stakes.
            The real work is turning attention into action.
          </li>
          <li>
            <strong>Built to compound.</strong> Clean, accessible,
            high-performance work that gains value for years, not weeks.
          </li>
          <li>
            <strong>Launch is the starting line.</strong> We optimise forever,
            because a system that stops improving starts decaying.
          </li>
          <li>
            <strong>Numbers that matter.</strong> Revenue and qualified leads, not
            likes, not vanity dashboards.
          </li>
        </ul>
      </section>

      <section className="core-block">
        <h2>No lock-ins. No fog. No drift.</h2>
        <p>
          Real reporting tied to revenue. Full transparency on what&rsquo;s working
          and what isn&rsquo;t. Zero long-term contracts trapping you in orbit: you
          stay because it&rsquo;s worth it, not because you&rsquo;re chained to us. That&rsquo;s
          the deal. That&rsquo;s always been the deal.
        </p>
      </section>

      <footer className="core-cta">
        <h2>Ready to own your space?</h2>
        <p>
          Tell us the market you&rsquo;re trying to bend. We&rsquo;ll show you the fastest
          path to the center.
        </p>
        <MissionControlButton className="service-cta-button">
          Open mission control →
        </MissionControlButton>
      </footer>
    </article>
  );
}

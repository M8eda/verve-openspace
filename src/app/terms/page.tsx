import type { Metadata } from "next";
import Link from "next/link";
import {
  contactEmail,
  contactPhoneDisplay,
  contactPhoneHref,
  copyrightNotice,
  defaultOgImage,
  siteName,
} from "@/lib/seo";

const title = "Terms of Use — Verve";
const description =
  "The terms that govern use of the Verve website and information about our digital agency services.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    type: "website",
    url: "/terms",
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

export default function TermsPage() {
  return (
    <article className="legal-page">
      <Link href="/" className="service-back">
        &larr; Back to the system
      </Link>

      <header className="legal-hero">
        <span className="core-eyebrow">LEGAL</span>
        <h1>Terms of Use</h1>
        <p>
          These terms explain the basic rules for using the Verve website. By using
          this website, you agree to these terms.
        </p>
        <p className="legal-updated">Last updated: October 1, 2026</p>
      </header>

      <section className="legal-block">
        <h2>Website use</h2>
        <p>
          You may browse this website for lawful personal or business purposes. You
          must not misuse the website, attempt to disrupt it, probe it for
          vulnerabilities, scrape it aggressively, or use it in a way that could harm
          Verve or other visitors.
        </p>
      </section>

      <section className="legal-block">
        <h2>Service information</h2>
        <p>
          The website describes Verve&rsquo;s digital agency services for general
          information only. Nothing on this website creates a client relationship,
          binding proposal, guarantee, or statement of work. Any paid client work
          should be governed by a separate written agreement.
        </p>
      </section>

      <section className="legal-block">
        <h2>Intellectual property</h2>
        <p>
          The Verve name, logo, visual identity, website design, copy, graphics,
          code, and other site materials are owned by Verve or used with permission,
          unless otherwise stated. All rights reserved. You may not copy, reproduce,
          modify, distribute, or reuse website materials without prior written
          permission from Verve.
        </p>
        <p>{copyrightNotice}</p>
      </section>

      <section className="legal-block">
        <h2>Trademarks</h2>
        <p>
          Verve and related brand assets may function as trademarks or service marks
          of Verve. The registered trademark symbol &reg; should only be used where a
          mark is formally registered in the relevant jurisdiction. Unless and until
          a registration is confirmed, Verve should be presented without the &reg;
          symbol or, where appropriate, with the unregistered trademark symbol &trade;.
        </p>
      </section>

      <section className="legal-block">
        <h2>Third-party services</h2>
        <p>
          This website may rely on third-party providers for hosting, analytics,
          email, fonts, infrastructure, or other features. Verve is not responsible
          for third-party websites, services, or policies that we do not control.
        </p>
      </section>

      <section className="legal-block">
        <h2>Limitation of liability</h2>
        <p>
          The website is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          basis. To the maximum extent permitted by law, Verve is not liable for
          damages arising from use of, or inability to use, this website.
        </p>
      </section>

      <section className="legal-block">
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms from time to time. The updated version will be
          posted on this page with a new last updated date.
        </p>
      </section>

      <section className="legal-block">
        <h2>Contact us</h2>
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or{" "}
          <a href={contactPhoneHref}>{contactPhoneDisplay}</a>.
        </p>
      </section>
    </article>
  );
}

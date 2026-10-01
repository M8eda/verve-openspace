import type { Metadata } from "next";
import Link from "next/link";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import {
  contactEmail,
  contactPhoneDisplay,
  contactPhoneHref,
  defaultOgImage,
  siteName,
} from "@/lib/seo";

const title = "Privacy Policy — Verve";
const description =
  "How Verve collects, uses, and protects information from website visitors and project inquiries.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    type: "website",
    url: "/privacy",
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

export default function PrivacyPage() {
  return (
    <article className="legal-page">
      <Link href="/" className="service-back">
        &larr; Back to the system
      </Link>

      <header className="legal-hero">
        <span className="core-eyebrow">LEGAL</span>
        <h1>Privacy Policy</h1>
        <p>
          This policy explains what information Verve collects through this website,
          how we use it, and how you can contact us about your information.
        </p>
        <p className="legal-updated">Last updated: October 1, 2026</p>
      </header>

      <section className="legal-block">
        <h2>Who we are</h2>
        <p>
          Verve is a digital agency offering brand strategy, web design, development,
          SEO, paid media, email marketing, and related digital growth services.
        </p>
      </section>

      <section className="legal-block">
        <h2>Information we collect</h2>
        <p>We may collect information you choose to provide, including:</p>
        <ul>
          <li>Your name and email address.</li>
          <li>Your phone number if you contact us by phone.</li>
          <li>Project details, messages, timelines, goals, and other inquiry information.</li>
        </ul>
        <p>
          We also collect basic website usage data through analytics tools, such as
          pages visited, approximate location, device/browser details, referral source,
          and interactions with key buttons or forms.
        </p>
      </section>

      <section className="legal-block">
        <h2>How we use information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Respond to inquiries and provide requested information.</li>
          <li>Understand website performance and improve the visitor experience.</li>
          <li>Measure interest in our services and improve our marketing.</li>
          <li>Protect the website from abuse, spam, or technical issues.</li>
        </ul>
      </section>

      <section className="legal-block">
        <h2>Analytics and cookies</h2>
        <p>
          We use Google Analytics to understand how visitors use the website. Google
          Analytics cookies are only stored if you allow them in the cookie banner;
          until then, analytics runs without cookies. You can change your choice at any
          time from &ldquo;Cookie settings&rdquo; here or in the footer of our service pages,
          and you can also control cookies through your browser settings.
        </p>
        {process.env.NODE_ENV === "production" ? (
          <p>
            <CookieSettingsButton />
          </p>
        ) : null}
      </section>

      <section className="legal-block">
        <h2>Sharing information</h2>
        <p>
          We do not sell personal information. We may share limited information with
          service providers that help operate this website, such as hosting,
          analytics, email, security, and infrastructure providers. These providers
          only receive information needed to perform their services.
        </p>
      </section>

      <section className="legal-block">
        <h2>Retention</h2>
        <p>
          Inquiry information is kept for as long as reasonably needed to respond,
          manage business records, and follow up on potential projects. Analytics
          information is retained according to the settings of the analytics provider.
        </p>
      </section>

      <section className="legal-block">
        <h2>Your choices</h2>
        <p>
          Depending on where you live, you may have rights to request access,
          correction, deletion, or restriction of your personal information. To make
          a request, contact us using the details below.
        </p>
      </section>

      <section className="legal-block">
        <h2>Contact us</h2>
        <p>
          For privacy questions or requests, contact Verve at{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or{" "}
          <a href={contactPhoneHref}>{contactPhoneDisplay}</a>.
        </p>
      </section>
    </article>
  );
}

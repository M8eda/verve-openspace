import type { Metadata } from "next";
import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: {
    absolute: "Signal lost — Verve",
  },
  robots: {
    index: false,
  },
};

export default function NotFound() {
  return (
    <article className="service-page not-found-page">
      <Link href="/" className="service-back">
        &larr; Back to the system
      </Link>

      <header className="service-hero service-pane">
        <div className="service-pane-bar">
          <span className="service-pane-tag">404 // SIGNAL LOST</span>
          <span className="service-pane-meta">NO ORBIT FOUND</span>
        </div>
        <div className="service-pane-body">
          <p className="service-boot" aria-hidden="true">
            <span className="service-prompt">&gt;</span> locate --target
          </p>
          <h1 className="service-headline">Off the map.</h1>
          <p className="service-tagline">This page drifted out of range.</p>
          <p className="service-lede">
            The link may be old or mistyped. Every planet in the system is still one jump away.
          </p>
        </div>
      </header>

      <section className="service-block service-pane">
        <div className="service-pane-bar">
          <h2 className="service-pane-title">Known planets</h2>
          <span className="service-pane-meta" aria-hidden="true">
            ls ./system
          </span>
        </div>
        <ul className="service-deliverables service-pane-body">
          {services.map((s) => (
            <li key={s.slug}>
              <span className="service-check" aria-hidden="true">
                {String(s.index).padStart(2, "0")}
              </span>
              <Link href={`/services/${s.slug}`}>{s.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="service-cta">
        <LegalLinks className="legal-links-service" />
      </footer>
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import LegalLinks from "@/components/LegalLinks";
import MissionControlButton from "@/components/MissionControlButton";
import ServiceHeadline from "@/components/ServiceHeadline";
import { getServiceBySlug, services } from "@/data/services";
import { defaultOgImage, serviceJsonLd, serviceKeywords, serviceUrl, siteName } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: { absolute: "Signal lost — Verve" }, robots: { index: false } };
  const title = `${service.name} — Verve Digital Agency`;
  const url = serviceUrl(service.slug);

  return {
    title: {
      absolute: title,
    },
    description: service.description,
    keywords: serviceKeywords(service.name),
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      type: "website",
      url,
      siteName,
      title,
      description: service.description,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: service.description,
      images: [defaultOgImage],
    },
  };
}

export default async function ServicePage({ params }: { params: Params }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const total = services.length;
  const pad = (n: number) => String(n).padStart(2, "0");
  const forceTag = service.index <= 4 ? "IGNITE" : service.index <= 7 ? "PULL" : "SUSTAIN";
  const structuredData = serviceJsonLd(slug);

  return (
    <article className="service-page" style={{ "--phosphor": service.visual.color } as CSSProperties}>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <Link href="/" className="service-back">
        &larr; Back to the system
      </Link>

      <header className="service-hero service-pane">
        <div className="service-pane-bar">
          <span className="service-pane-tag">
            {`${pad(service.index)} // ${service.shortName}`}
          </span>
          <span className="service-pane-meta">
            {forceTag} · SYS ID:{pad(service.index)}/{pad(total)}
          </span>
        </div>
        <div className="service-pane-body">
          <ServiceHeadline slug={service.slug} name={service.name} />
          <p className="service-tagline">{service.tagline}</p>
          <p className="service-lede">{service.description}</p>
        </div>
      </header>

      <section className="service-block service-pane">
        <div className="service-pane-bar">
          <h2 className="service-pane-title">Key benefits</h2>
          <span className="service-pane-meta" aria-hidden="true">
            scan --benefits
          </span>
        </div>
        <ul className="service-benefits service-pane-body">
          {service.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="service-block service-pane">
        <div className="service-pane-bar">
          <h2 className="service-pane-title">Process</h2>
          <span className="service-pane-meta" aria-hidden="true">
            run mission.sh
          </span>
        </div>
        <ol className="service-process service-pane-body">
          {service.process.map((step, i) => (
            <li key={step.title}>
              <span className="service-process-index">{pad(i + 1)}</span>
              <div>
                <h3>
                  <span className="service-prompt" aria-hidden="true">
                    &gt;{" "}
                  </span>
                  {step.title}
                </h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="service-block service-pane">
        <div className="service-pane-bar">
          <h2 className="service-pane-title">Deliverables</h2>
          <span className="service-pane-meta" aria-hidden="true">
            {pad(service.deliverables.length)} items · ready
          </span>
        </div>
        <ul className="service-deliverables service-pane-body">
          {service.deliverables.map((d) => (
            <li key={d}>
              <span className="service-check" aria-hidden="true">
                [x]
              </span>
              {d}
            </li>
          ))}
        </ul>
      </section>

      <footer className="service-cta">
        <div className="service-cta-row">
          <span className="service-cta-label" aria-hidden="true">
            Enter option:
          </span>
          <MissionControlButton className="service-cta-button service-cta-terminal" source={`service_cta_${service.slug}`}>
            [ Start project ]
          </MissionControlButton>
        </div>
        <LegalLinks className="legal-links-service" />
      </footer>
    </article>
  );
}

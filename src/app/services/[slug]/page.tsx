import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LegalLinks from "@/components/LegalLinks";
import MissionControlButton from "@/components/MissionControlButton";
import { getServiceBySlug, services } from "@/data/services";
import { defaultOgImage, serviceJsonLd, serviceKeywords, serviceUrl, siteName } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
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
  const forceTag = service.index <= 4 ? "IGNITE" : service.index <= 7 ? "PULL" : "SUSTAIN";
  const structuredData = serviceJsonLd(slug);

  return (
    <article className="service-page">
      {structuredData ? (
        <Script
          id={`service-structured-data-${service.slug}`}
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <Link href="/" className="service-back">
        &larr; Back to the system
      </Link>

      <header className="service-hero">
        <span className="service-force">{forceTag}</span>
        <span className="service-eyebrow">
          {String(service.index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <h1>{service.name}</h1>
        <p className="service-lede">{service.description}</p>
      </header>

      <section className="service-block">
        <h2>Key benefits</h2>
        <ul className="service-benefits">
          {service.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="service-block">
        <h2>Process</h2>
        <ol className="service-process">
          {service.process.map((step, i) => (
            <li key={step.title}>
              <span className="service-process-index">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="service-block">
        <h2>Deliverables</h2>
        <ul className="service-deliverables">
          {service.deliverables.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <footer className="service-cta">
        <MissionControlButton className="service-cta-button" source={`service_cta_${service.slug}`}>
          Start this project
        </MissionControlButton>
        <LegalLinks className="legal-links-service" />
      </footer>
    </article>
  );
}

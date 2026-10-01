import { services } from "@/data/services";

export const siteUrl = "https://verve-marketing.space";
export const siteName = "Verve";
export const contactEmail = "info@verve-marketing.space";
export const contactPhoneDisplay = "+20 11 16741301";
/** E.164 form, for structured data. */
export const contactPhoneE164 = "+201116741301";
export const contactPhoneHref = `tel:${contactPhoneE164}`;
/**
 * The company's own public profiles (LinkedIn, Instagram, X…). Search engines
 * use these to tie the profiles to the site; leave empty rather than listing
 * pages that aren't official company profiles.
 */
export const socialProfiles: string[] = [];
// Stamped at build time (next.config.ts) so server HTML and the client bundle
// always agree; each deploy picks up the current year.
export const copyrightNotice = `© ${process.env.BUILD_YEAR} ${siteName}. All rights reserved.`;
export const defaultTitle = "Verve — Brand, Web Design & Digital Growth Agency";
export const defaultDescription =
  "Verve is a digital agency building brand, web design, SEO, paid media, email marketing, and growth systems that help ambitious companies own their space.";
export const defaultOgImage = "/og-image.png";

export const seoKeywords = [
  "Verve",
  "digital agency",
  "brand strategy",
  "branding agency",
  "web design agency",
  "web development agency",
  "SEO agency",
  "digital marketing agency",
  "paid advertising",
  "email marketing",
  "UI UX design",
  "mobile app development",
  "growth marketing",
];

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function serviceUrl(slug: string) {
  return absoluteUrl(`/services/${slug}`);
}

export function serviceKeywords(serviceName: string) {
  return [serviceName, ...seoKeywords];
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    // Google wants a raster logo (at least 112px); public/logo.png is the
    // icon rendered at 512px.
    logo: absoluteUrl("/logo.png"),
    description: defaultDescription,
    email: contactEmail,
    telephone: contactPhoneE164,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: contactPhoneE164,
      email: contactEmail,
      contactType: "customer service",
      areaServed: "Worldwide",
      availableLanguage: ["en"],
    },
    ...(socialProfiles.length > 0 ? { sameAs: socialProfiles } : {}),
    makesOffer: services.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        url: serviceUrl(service.slug),
      },
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: defaultDescription,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };
}

export function serviceJsonLd(slug: string) {
  const service = services.find((s) => s.slug === slug);
  if (!service) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    description: service.description,
    url: serviceUrl(service.slug),
    provider: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    areaServed: "Worldwide",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.name} deliverables`,
      itemListElement: service.deliverables.map((deliverable) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: deliverable,
        },
      })),
    },
  };
}

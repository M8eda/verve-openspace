import type { MetadataRoute } from "next";
import { services } from "@/data/services";
import { absoluteUrl, siteUrl } from "@/lib/seo";

/**
 * Real "last changed" dates. Bump the matching one when that content changes;
 * a date that moves on every build teaches crawlers to ignore it.
 */
const CONTENT_UPDATED = {
  home: "2026-10-01",
  core: "2026-10-01",
  services: "2026-10-01",
  legal: "2026-10-01",
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: CONTENT_UPDATED.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/core"),
      lastModified: CONTENT_UPDATED.core,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: CONTENT_UPDATED.legal,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: CONTENT_UPDATED.legal,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...services.map((service) => ({
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: CONTENT_UPDATED.services,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}

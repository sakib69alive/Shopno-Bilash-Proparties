import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Keeps crawlers out of the not-yet-public admin/portal/auth areas and the API — only the marketing site should be indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/portal", "/login", "/api", "/go"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

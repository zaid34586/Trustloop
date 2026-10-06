import type { MetadataRoute } from "next";

const site =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Marketing routes only — dashboard and auth routes stay out of the
// sitemap; /dashboard is disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/pricing",
    "/about",
    "/contact",
    "/security",
    "/privacy",
    "/terms",
    "/refund-policy",
  ];
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${site}${route}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.6,
  }));
}

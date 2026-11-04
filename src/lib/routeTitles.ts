import type { Project } from "@/content/projects";
import type { Unit } from "@/content/units";
import type { NewsArticle } from "@/content/news";

export interface RouteTitleData {
  projects: Pick<Project, "slug" | "name">[];
  units: Pick<Unit, "slug" | "projectSlug" | "name">[];
  newsArticles: Pick<NewsArticle, "slug" | "title">[];
}

/**
 * Centralized destination-title lookup for the page-transition overlay
 * (Step §23). Static routes come from this map; dynamic routes resolve to
 * the actual record's name using live CMS data (`data`, fetched once by
 * `(public)/layout.tsx` via `getSiteNavDataAsync` and passed down to
 * `SitePageLoader` as a prop) — never a network call from here, and
 * never invented when a slug doesn't match anything real.
 */
const STATIC_TITLES: Record<string, string> = {
  "/": "HOME",
  "/about": "ABOUT",
  "/projects": "PROJECTS",
  "/properties": "PROPERTIES",
  "/services": "SERVICES",
  "/landowners": "LANDOWNERS & JV",
  "/gallery": "GALLERY",
  "/news": "NEWS",
  "/contact": "ENQUIRE",
};

function titleCaseFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").toUpperCase();
}

/**
 * Resolves a pathname (and optional hash, for the Landowners/Investment
 * anchor split) to the destination title shown during the transition
 * overlay. Falls back to a title-cased last path segment for any route not
 * explicitly known, rather than a blank or generic "PAGE" label.
 */
export function getRouteTitle(pathname: string, data: RouteTitleData, hash?: string): string {
  if (hash === "#investment" && pathname === "/landowners") return "INVESTMENT";
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];

  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "projects" && segments[1]) {
    const project = data.projects.find((p) => p.slug === segments[1]);
    if (segments[2] === "units" && segments[3]) {
      const unit = data.units.find((u) => u.slug === segments[3] && u.projectSlug === segments[1]);
      return unit ? unit.name.toUpperCase() : "PROPERTY";
    }
    if (segments[2] === "construction") return "CONSTRUCTION";
    return project ? project.name.toUpperCase() : "PROJECT";
  }

  if (segments[0] === "news" && segments[1]) {
    const article = data.newsArticles.find((a) => a.slug === segments[1]);
    return article ? article.title.toUpperCase() : "NEWS";
  }

  if (segments.length === 0) return "HOME";
  return titleCaseFromSlug(segments[segments.length - 1]);
}

const MOBILE_STATIC_TITLES: Record<string, string> = {
  "/about": "About",
  "/projects": "Projects",
  "/properties": "Properties",
  "/services": "Services",
  "/landowners": "Landowners & JV",
  "/gallery": "Gallery",
  "/news": "News",
  "/contact": "Enquire",
  "/saved": "Saved",
  "/founder": "Founder",
  "/construction": "Construction",
  "/privacy": "Privacy Policy",
  "/terms": "Terms & Conditions",
  "/cookies": "Cookie Policy",
  "/disclaimer": "Property Disclaimer",
  "/policy": "Company Policy",
  "/sitemap": "Sitemap",
};

/**
 * Title shown in the phone layout's top bar — same lookups as
 * `getRouteTitle`, but as readable mixed case ("Meridian Residences", not
 * "MERIDIAN RESIDENCES") because it sits in the page chrome rather than a
 * full-screen ceremony. Never invents a name for a slug that matches nothing.
 */
export function getMobileTitle(pathname: string, data: RouteTitleData, hash?: string): string {
  if (hash === "#investment" && pathname === "/landowners") return "Investment";
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (MOBILE_STATIC_TITLES[normalized]) return MOBILE_STATIC_TITLES[normalized];

  const segments = normalized.split("/").filter(Boolean);

  if (segments[0] === "projects" && segments[1]) {
    const project = data.projects.find((p) => p.slug === segments[1]);
    if (segments[2] === "units" && segments[3]) {
      const unit = data.units.find((u) => u.slug === segments[3] && u.projectSlug === segments[1]);
      return unit?.name ?? "Property";
    }
    if (segments[2] === "construction") return "Construction";
    return project?.name ?? "Project";
  }

  if (segments[0] === "news" && segments[1]) {
    return data.newsArticles.find((a) => a.slug === segments[1])?.title ?? "News";
  }

  return "";
}

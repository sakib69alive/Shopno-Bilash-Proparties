/**
 * Map links for a project's Location section.
 *
 * Admin pastes whatever Google Maps gives them — the "Embed a map" HTML code,
 * a normal maps link, a short share link, or plain coordinates — and this file
 * turns it into (a) something we can show inside the page and (b) an
 * "Open in Maps" link. Nothing is uploaded or stored on our side and no API key
 * or billing is involved: only the pasted text is kept on the project.
 *
 * HOW TO EXTEND LATER (e.g. units, landowner sites, another map provider):
 *   1. Add the new link shape to `parseMapInput` (return `{ embedUrl?, openUrl }`).
 *   2. Add `mapUrl` to that record's type + save action, using `checkMapField`.
 *   3. Render `<LocationMap mapUrl={…} />` (components/ui/LocationMap.tsx).
 * Nothing else needs to change. No "server-only": the admin save action and the
 * public page both import this.
 */

export interface MapSource {
  /** What goes in the iframe. Absent when the link can't be shown inside a page (short links) — then only the button shows. */
  embedUrl?: string;
  /** Where "Open in Google Maps" goes. */
  openUrl: string;
}

const GOOGLE_HOSTS = new Set(["google.com", "maps.google.com", "google.com.bd", "maps.google.com.bd"]);
const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

function host(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

function toHttpsUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

/** Embed URL for a coordinate pair — works without any API key. */
function coordsEmbed(lat: string, lng: string): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

function coordsOpen(lat: string, lng: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Pulls `src="…"` out of a pasted `<iframe …>` snippet. */
function iframeSrc(raw: string): string | null {
  const m = raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

/** Turns whatever was pasted into a map we can show, or `null` when it isn't a Google Maps thing we understand. */
export function parseMapInput(raw: string | undefined | null): MapSource | null {
  if (!raw) return null;
  const input = raw.trim();
  if (!input) return null;

  // 1. Plain coordinates: "23.7925, 90.4078"
  const coords = input.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coords) {
    const lat = Number(coords[1]);
    const lng = Number(coords[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { embedUrl: coordsEmbed(coords[1], coords[2]), openUrl: coordsOpen(coords[1], coords[2]) };
    }
    return null;
  }

  // 2. The "Embed a map" HTML code (<iframe src="https://www.google.com/maps/embed?pb=…">)
  const fromIframe = input.startsWith("<") ? iframeSrc(input) : null;
  const url = toHttpsUrl(fromIframe ?? input);
  if (!url) return null;
  const h = host(url);

  // Embed links: only Google's own embed endpoints are allowed inside our page.
  if (GOOGLE_HOSTS.has(h) && (url.pathname.startsWith("/maps/embed") || url.searchParams.get("output") === "embed")) {
    return { embedUrl: url.toString(), openUrl: url.toString().replace("/maps/embed", "/maps") };
  }

  // 3. A normal Google Maps link: the page URL carries "@lat,lng" or "?q=" / "?query=".
  if (GOOGLE_HOSTS.has(h) && url.pathname.startsWith("/maps")) {
    const at = url.pathname.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (at) return { embedUrl: coordsEmbed(at[1], at[2]), openUrl: url.toString() };
    const q = url.searchParams.get("q") ?? url.searchParams.get("query");
    if (q) {
      return { embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`, openUrl: url.toString() };
    }
    const place = url.pathname.match(/^\/maps\/place\/([^/@]+)/);
    if (place) {
      return { embedUrl: `https://maps.google.com/maps?q=${place[1]}&z=16&output=embed`, openUrl: url.toString() };
    }
    return { openUrl: url.toString() };
  }

  // 4. Short share links (maps.app.goo.gl/…): can't be embedded, but the button works.
  if (SHORT_HOSTS.has(h) && (h === "maps.app.goo.gl" || url.pathname.startsWith("/maps"))) {
    return { openUrl: url.toString() };
  }

  return null;
}

export type MapFieldResult = { value?: string; error?: string };

/**
 * Admin-side check: empty is fine (the placeholder stays); anything typed must be understood.
 * The stored value is the cleaned-up link or coordinates, never raw HTML.
 */
export function checkMapField(raw: string): MapFieldResult {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const source = parseMapInput(trimmed);
  if (!source) {
    return {
      error:
        "That map link isn't one we can use. In Google Maps tap Share, then either \"Embed a map\" → Copy HTML, or copy the link. You can also type coordinates like 23.7925, 90.4078.",
    };
  }
  // Keep the shortest useful thing: embed code → its src; otherwise what was typed.
  const fromIframe = trimmed.startsWith("<") ? iframeSrc(trimmed) : null;
  return { value: fromIframe ?? trimmed };
}

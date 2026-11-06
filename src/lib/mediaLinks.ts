/**
 * Video and 360° tour links for projects and units.
 *
 * Admin pastes a plain web link (a YouTube / Vimeo / Facebook video, a direct
 * .mp4 file, or any 360° tour page such as Matterport or Kuula). Nothing is
 * uploaded or stored on our side — the link is kept as text on the project/unit
 * and turned into something playable here. No "server-only": the public site's
 * client components and the admin save actions both use it.
 */

export type VideoKind = "youtube" | "vimeo" | "facebook" | "file";

export interface VideoSource {
  kind: VideoKind;
  /** What goes in the iframe (or the <video> src for `file`). */
  embedUrl: string;
  /** The original page, for an "Open in new tab" fallback. */
  watchUrl: string;
}

export interface TourSource {
  embedUrl: string;
  openUrl: string;
}

function toHttpsUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Allow "youtube.com/..." typed without the scheme.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    // https only: an http link would be blocked inside our https pages anyway, and it keeps javascript:/data: out.
    if (url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return url.pathname.split("/")[1] || null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/);
    if (m) return m[1];
  }
  return null;
}

/** Turns a pasted video link into something we can play, or `null` when it isn't a kind we can embed. */
export function parseVideoUrl(raw: string | undefined | null): VideoSource | null {
  if (!raw) return null;
  const url = toHttpsUrl(raw);
  if (!url) return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  const yt = youtubeId(url);
  if (yt && /^[\w-]{6,}$/.test(yt)) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1&autoplay=1`,
      watchUrl: `https://www.youtube.com/watch?v=${yt}`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/(\d{5,})/)?.[1];
    if (id) {
      return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`, watchUrl: `https://vimeo.com/${id}` };
    }
  }

  if (host === "facebook.com" || host === "fb.watch" || host === "fb.com") {
    return {
      kind: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false&autoplay=true`,
      watchUrl: url.toString(),
    };
  }

  if (/\.(mp4|webm|ogg|m4v|mov)$/i.test(url.pathname)) {
    return { kind: "file", embedUrl: url.toString(), watchUrl: url.toString() };
  }

  return null;
}

/** A 360° tour is any https page that allows being shown inside another page (Matterport, Kuula, Google Street View, …). */
export function parseTourUrl(raw: string | undefined | null): TourSource | null {
  if (!raw) return null;
  const url = toHttpsUrl(raw);
  if (!url) return null;
  return { embedUrl: url.toString(), openUrl: url.toString() };
}

export type MediaFieldResult = { value?: string; error?: string };

/** Admin-side check: empty is fine (the section simply won't show); anything typed must be a link we can actually use. */
export function checkVideoField(raw: string): MediaFieldResult {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const source = parseVideoUrl(trimmed);
  if (!source) {
    return { error: "That video link isn't one we can play. Paste a YouTube, Vimeo or Facebook video link, or a direct .mp4 link." };
  }
  return { value: toHttpsUrl(trimmed)!.toString() };
}

export function checkTourField(raw: string): MediaFieldResult {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const source = parseTourUrl(trimmed);
  if (!source) return { error: "That 360° tour link doesn't look right. Paste the full https:// link of the tour page." };
  return { value: source.openUrl };
}

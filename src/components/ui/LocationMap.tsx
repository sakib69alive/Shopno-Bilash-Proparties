import { ArrowUpRight, Hand, MapPin, Navigation } from "lucide-react";
import { parseMapInput } from "@/lib/mapLinks";

/**
 * A map for any record that stores a `mapUrl` (see `lib/mapLinks.ts`): the live
 * map when the link can be embedded, an "Open in Google Maps" button always,
 * and the plain placeholder when nothing was added. Reusable as-is — pass the
 * stored string and a label.
 *
 * The map itself is Google's own embed (free, no key). Google asks for TWO fingers to move it on a phone so one finger can still
 * scroll the page — that rule is inside Google's frame and cannot be changed from here, so the card says it kindly and the button
 * under it opens the full Google Maps app, where one finger works.
 */

/** Where "Get directions" goes: the place name or the coordinates the map was built from. */
function directionsHref(embedUrl?: string, openUrl?: string): string | null {
  const read = (u?: string, ...keys: string[]) => {
    if (!u) return null;
    try {
      const url = new URL(u);
      for (const k of keys) {
        const v = url.searchParams.get(k);
        if (v) return v;
      }
      const at = url.pathname.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
      return at ? `${at[1]},${at[2]}` : null;
    } catch {
      return null;
    }
  };
  const place = read(embedUrl, "q") ?? read(openUrl, "q", "query");
  return place ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}` : null;
}

export function LocationMap({ mapUrl, label }: { mapUrl?: string; label: string }) {
  const map = parseMapInput(mapUrl);

  if (!map) {
    return (
      <div className="border-border-strong from-surface-raised to-surface relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[1.75rem] border bg-gradient-to-br sm:aspect-[16/9]">
        <div className="text-center">
          <span className="bg-accent-soft text-accent mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <MapPin aria-hidden className="size-5" />
          </span>
          <p className="text-label text-fg-subtle uppercase">{label}</p>
        </div>
      </div>
    );
  }

  const directions = directionsHref(map.embedUrl, map.openUrl);

  return (
    <div className="flex flex-col gap-4">
      {map.embedUrl && (
        <figure className="m-0">
          {/* A framed "card": soft shadow, a thin inner border and a floating place tag — the map inside is Google's live embed. */}
          <div className="border-border-strong bg-surface-raised rounded-[1.9rem] border p-1.5 shadow-[0_28px_60px_-28px_rgb(28_27_25/0.45)]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] sm:aspect-[16/9]">
              <iframe
                src={map.embedUrl}
                title={`Map: ${label}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="size-full border-0"
              />
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-black/10 ring-inset" />
              <span className="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full bg-white/92 py-1.5 pr-4 pl-1.5 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.4)] backdrop-blur">
                <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full">
                  <MapPin aria-hidden className="size-3.5" />
                </span>
                <span className="text-fg truncate text-[0.8125rem] font-semibold">{label}</span>
              </span>
            </div>
          </div>
          <figcaption className="text-fg-subtle mt-3 flex items-center justify-center gap-2 text-xs">
            <Hand aria-hidden className="size-3.5" />
            <span className="hidden [@media(pointer:coarse)]:inline">Use two fingers to move the map · tap Open for the full map</span>
            <span className="[@media(pointer:coarse)]:hidden">Hold Ctrl and scroll to zoom · drag to move</span>
          </figcaption>
        </figure>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={map.openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-accent text-accent-foreground text-label inline-flex h-12 touch-manipulation items-center gap-2 rounded-full px-5 font-semibold shadow-[0_10px_24px_-10px_rgb(31_61_51/0.7)] transition-[transform,opacity] active:scale-[0.98] active:opacity-90"
        >
          <MapPin aria-hidden className="size-4" />
          Open in Google Maps
          <ArrowUpRight aria-hidden className="size-4" />
        </a>
        {directions && (
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border-strong bg-surface-raised text-fg text-label inline-flex h-12 touch-manipulation items-center gap-2 rounded-full border px-5 font-semibold transition-[transform,background-color] active:scale-[0.98]"
          >
            <Navigation aria-hidden className="size-4" />
            Get directions
          </a>
        )}
      </div>
    </div>
  );
}

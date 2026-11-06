import { ArrowUpRight, MapPin } from "lucide-react";
import { parseMapInput } from "@/lib/mapLinks";

/**
 * A map for any record that stores a `mapUrl` (see `lib/mapLinks.ts`): the live
 * map when the link can be embedded, an "Open in Google Maps" button always,
 * and the plain placeholder when nothing was added. Reusable as-is — pass the
 * stored string and a label.
 */
export function LocationMap({ mapUrl, label }: { mapUrl?: string; label: string }) {
  const map = parseMapInput(mapUrl);

  if (!map) {
    return (
      <div className="border-border-strong bg-surface-raised flex aspect-[4/3] w-full items-center justify-center rounded-md border sm:aspect-[16/9]">
        <div className="text-center">
          <MapPin aria-hidden className="text-fg-subtle mx-auto mb-3 size-6" />
          <p className="text-label text-fg-subtle uppercase">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {map.embedUrl && (
        <div className="border-border-strong bg-surface-raised aspect-[4/3] w-full overflow-hidden rounded-md border sm:aspect-[16/9]">
          <iframe
            src={map.embedUrl}
            title={`Map: ${label}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="size-full border-0"
          />
        </div>
      )}
      <a
        href={map.openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-accent text-accent-foreground text-label inline-flex h-12 w-fit touch-manipulation items-center gap-2 rounded-full px-5 font-semibold transition-colors active:opacity-90"
      >
        <MapPin aria-hidden className="size-4" />
        Open in Google Maps
        <ArrowUpRight aria-hidden className="size-4" />
      </a>
    </div>
  );
}

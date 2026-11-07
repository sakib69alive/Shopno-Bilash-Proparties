import Link from "next/link";
import { Bath, BedDouble, MapPin, Ruler, DoorOpen } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { MediaBadges } from "@/components/media/MediaBadges";
import { SaveButton } from "@/components/saved/SaveButton";
import { UNIT_STATUS_LABEL, UNIT_STATUS_TONE } from "@/content/units";
import type { PropertyListing } from "@/lib/properties";
import { cn } from "@/lib/utils";

export interface PropertyCardMProps {
  listing: PropertyListing;
  /** "rail" is a fixed-width card for a swipe `Rail`; "full" fills its column. */
  layout?: "rail" | "full";
  className?: string;
}

/**
 * Phone listing card: photo with status and save button, then name, price
 * and only the spec fields this unit actually has. No rating, no fake
 * "New" badge — the status shown is the unit's real status.
 */
export function PropertyCardM({ listing, layout = "full", className }: PropertyCardMProps) {
  const href = `/projects/${listing.project.slug}/units/${listing.slug}`;
  const specs = [
    listing.bedrooms !== undefined ? { icon: BedDouble, label: `${listing.bedrooms} Bed` } : null,
    listing.bathrooms !== undefined ? { icon: Bath, label: `${listing.bathrooms} Bath` } : null,
    listing.balconies !== undefined && listing.balconies > 0 ? { icon: DoorOpen, label: `${listing.balconies} Balcon${listing.balconies === 1 ? "y" : "ies"}` } : null,
    listing.area ? { icon: Ruler, label: listing.area } : null,
  ].filter((s): s is { icon: typeof BedDouble; label: string } => s !== null);

  return (
    <div
      className={cn(
        "bg-surface-raised border-border relative overflow-hidden rounded-[var(--m-radius-card)] border",
        layout === "rail" && "w-[72vw] max-w-[300px]",
        className,
      )}
    >
      <Link href={href} className="block transition-transform duration-150 active:scale-[0.98]">
        <div className="relative">
          <Media
            ratio="standard"
            src={listing.coverImage.src}
            alt={listing.coverImage.alt}
            sizes={layout === "rail" ? "(min-width: 640px) 300px, 72vw" : "(min-width: 768px) 50vw, 100vw"}
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 text-white px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
            <span className={cn("size-1.5 rounded-full", UNIT_STATUS_TONE[listing.status])} aria-hidden />
            {UNIT_STATUS_LABEL[listing.status]}
          </span>
          <MediaBadges videoUrl={listing.videoUrl} tour360Url={listing.tour360Url} className="absolute bottom-3 left-3" />
        </div>

        <div className="p-4">
          <h3 className="text-h4 line-clamp-1">{listing.name}</h3>
          {listing.unitType === "Whole building" && <span className="bg-accent-soft text-accent mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">Whole building · sold as one</span>}
          {listing.price ? (
            <p className="text-accent mt-1 text-lg font-semibold">{listing.price}</p>
          ) : (
            <p className="text-fg-subtle mt-1 text-base">Price on request</p>
          )}
          {specs.length > 0 && (
            <div className="text-body-sm text-fg-muted mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1">
              {specs.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Icon aria-hidden className="text-fg-subtle size-4" />
                  {label}
                </span>
              ))}
            </div>
          )}
          <p className="text-body-sm text-fg-muted mt-2 flex items-center gap-1.5">
            <MapPin aria-hidden className="text-fg-subtle size-4 shrink-0" />
            <span className="line-clamp-1">{listing.project.location}</span>
          </p>
        </div>
      </Link>
      <SaveButton id={listing.id} name={listing.name} className="absolute top-3 right-3 z-10 size-10" />
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, BedDouble, Building2, Ruler, Bath, DoorOpen } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { MediaBadges } from "@/components/media/MediaBadges";
import { SaveButton } from "@/components/saved/SaveButton";
import { UNIT_STATUS_LABEL, UNIT_STATUS_TONE } from "@/content/units";
import { cn } from "@/lib/utils";
import type { PropertyListing } from "@/lib/properties";

const HOVER_ZOOM = "transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-105";

/**
 * The one listing-card design for /properties — image, status, name, a
 * short spec row (only the fields this particular unit actually has), and
 * price when it exists. Deliberately not a bordered/shadowed "product card":
 * whitespace and a hairline top rule do the separating, matching
 * <ProjectCard>'s editorial language rather than a marketplace grid.
 */
export function PropertyCard({ listing, index }: { listing: PropertyListing; index?: number }) {
  const href = `/projects/${listing.project.slug}/units/${listing.slug}`;
  const number = index !== undefined ? String(index + 1).padStart(2, "0") : undefined;

  const specs = [
    listing.bedrooms !== undefined ? { icon: BedDouble, label: `${listing.bedrooms} Bed` } : null,
    listing.bathrooms !== undefined ? { icon: Bath, label: `${listing.bathrooms} Bath` } : null,
    listing.balconies !== undefined && listing.balconies > 0 ? { icon: DoorOpen, label: `${listing.balconies} Balcon${listing.balconies === 1 ? "y" : "ies"}` } : null,
    listing.area ? { icon: Ruler, label: listing.area } : null,
    listing.floor !== undefined ? { icon: Building2, label: `Floor ${listing.floor}` } : null,
  ].filter((s): s is { icon: typeof BedDouble; label: string } => s !== null);

  return (
    <div className="group relative flex flex-col">
      <SaveButton
        id={listing.id}
        name={listing.name}
        className="absolute top-4 right-4 z-10"
      />
      <Link href={href} className="flex flex-col">
        <div className="relative">
          <Media
            ratio="standard"
            radius="md"
            src={listing.coverImage.src}
            alt={listing.coverImage.alt}
            className={HOVER_ZOOM}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-sm border border-white/25 bg-black/35 text-white px-2.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
            <span className={cn("size-1.5 rounded-full", UNIT_STATUS_TONE[listing.status])} aria-hidden />
            {UNIT_STATUS_LABEL[listing.status]}
          </span>
          <MediaBadges videoUrl={listing.videoUrl} tour360Url={listing.tour360Url} className="absolute bottom-4 left-4" />
        </div>

          <div className="mt-5 flex flex-1 flex-col">
            <p className="text-caption text-fg-subtle uppercase">
              {number && <span className="tabular-nums">{number} · </span>}
              {listing.project.name} · {listing.project.city}
            </p>
            <h3 className="text-h3 mt-1.5 group-hover:text-accent transition-colors duration-200">
              {listing.name}
            </h3>
            <p className="text-caption text-fg-subtle mt-0.5 uppercase">
              {listing.unitType === "Whole building" ? <span className="bg-accent-soft text-accent rounded-full px-2.5 py-0.5 font-semibold">Whole building · sold as one</span> : listing.unitType}
            </p>

            {specs.length > 0 && (
              <div className="text-body-sm text-fg-muted mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {specs.map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <Icon aria-hidden className="text-fg-subtle size-4" />
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-end justify-between gap-4 pt-6">
              {listing.price ? (
                <p className="text-h4 text-accent">{listing.price}</p>
              ) : (
                <p className="text-body-sm text-fg-subtle">Price on request</p>
              )}
              <span className="text-button text-fg inline-flex shrink-0 items-center gap-1.5">
                Details
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1"
                />
              </span>
            </div>
          </div>
      </Link>
    </div>
  );
}

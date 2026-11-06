import Link from "next/link";
import { MapPin } from "lucide-react";
import { SaveButton } from "@/components/saved/SaveButton";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";
import { UNIT_STATUS_LABEL, UNIT_STATUS_TONE, type Unit } from "@/content/units";
import { mapsSearchHref } from "@/lib/contactLinks";
import { cn } from "@/lib/utils";
import { ActionBar } from "./ActionBar";
import { PhotoPager } from "./PhotoPager";
import { PropertyCardM } from "./PropertyCardM";
import { Rail } from "./Rail";
import { SectionHeading } from "./SectionHeading";
import { UnitPlanCard } from "./UnitPlanCard";
import { MediaExperience } from "@/components/media/MediaExperience";

/**
 * Phone layout of the unit page (below `lg`): swipe photos, title + price,
 * floor-plan card, remaining details, description, project link and related
 * units, with Call / WhatsApp / Enquire pinned at the bottom. Desktop keeps
 * its own sections.
 */
export function UnitDetailM({ unit, project, otherUnits }: { unit: Unit; project: Project; otherUnits: Unit[] }) {
  const photos = [unit.coverImage, ...unit.gallery.filter((g) => g.src !== unit.coverImage.src)];

  // The floor-plan card already shows beds, baths, size and price.
  const details = [
    unit.unitNumber ? { label: "Unit", value: unit.unitNumber } : null,
    unit.floor !== undefined ? { label: "Floor", value: String(unit.floor) } : null,
    { label: "Type", value: unit.unitType },
    unit.balconies !== undefined ? { label: "Balconies", value: String(unit.balconies) } : null,
    unit.parking !== undefined ? { label: "Parking", value: String(unit.parking) } : null,
    unit.facing ? { label: "Facing", value: unit.facing } : null,
  ].filter((d): d is { label: string; value: string } => d !== null);

  const features = unit.features ?? [];
  const enquireQuery = `project=${encodeURIComponent(project.name)}&unit=${encodeURIComponent(unit.name)}&type=property`;
  const related = otherUnits.slice(0, 6).map((u) => ({ ...u, project }));

  return (
    <div className="flex flex-col gap-7 pt-3 pb-4 lg:hidden">
      <div className="px-[var(--gutter)]">
        <PhotoPager
          images={photos}
          aspectClassName="aspect-[4/3]"
          className="rounded-[var(--m-radius-hero)]"
          sizes="(min-width: 768px) 90vw, 100vw"
        >
          <SaveButton id={unit.id} name={unit.name} className="absolute top-3 right-3 z-10 size-11" />
          <span className="bg-bg text-fg absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
            <span className={cn("size-1.5 rounded-full", UNIT_STATUS_TONE[unit.status])} aria-hidden />
            {UNIT_STATUS_LABEL[unit.status]}
          </span>
        </PhotoPager>
      </div>

      <div className="px-[var(--gutter)]">
        <Link
          href={`/projects/${project.slug}`}
          className="text-label text-fg-subtle inline-flex min-h-8 items-center uppercase"
        >
          {project.name} · {unit.unitType}
        </Link>
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight">{unit.name}</h1>
        {unit.price ? (
          <p className="text-accent mt-1.5 text-xl font-semibold">{unit.price}</p>
        ) : (
          <p className="text-fg-subtle mt-1.5 text-base">Price on request</p>
        )}
        <p className="text-fg-muted mt-3 text-base leading-relaxed">{unit.shortDescription}</p>
        <a
          href={mapsSearchHref(project.location)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fg-muted mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm"
        >
          <MapPin aria-hidden className="text-fg-subtle size-4 shrink-0" />
          {project.location}
        </a>
      </div>

      <MediaExperience variant="inline" videoUrl={unit.videoUrl} tour360Url={unit.tour360Url} title={unit.name} />

      <div className="px-[var(--gutter)]">
        <UnitPlanCard unit={unit} />
      </div>

      {details.length > 0 && (
        <section aria-label="Details" className="px-[var(--gutter)]">
          <dl className="bg-surface-raised border-border grid grid-cols-2 gap-x-4 gap-y-5 rounded-[var(--m-radius-card)] border p-5">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-body-sm text-fg-subtle">{d.label}</dt>
                <dd className="mt-0.5 text-base font-semibold">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(unit.description || features.length > 0) && (
        <section className="px-[var(--gutter)]">
          <h2 className="font-display text-[1.25rem] leading-tight font-semibold tracking-tight">About this home</h2>
          {unit.description && <p className="text-fg-muted mt-2.5 text-base leading-relaxed">{unit.description}</p>}
          {features.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {features.map((f) => (
                <li key={f} className="bg-accent-soft text-accent rounded-full px-3.5 py-2 text-sm font-medium">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="px-[var(--gutter)]">
        <Link
          href={`/projects/${project.slug}`}
          className="bg-surface-raised border-border flex items-center gap-3 rounded-[var(--m-radius-card)] border p-4 transition-transform active:scale-[0.98]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-caption text-fg-subtle uppercase">Part of</p>
            <p className="text-h4 mt-0.5 truncate">{project.name}</p>
            <p className="text-body-sm text-fg-muted mt-0.5 truncate">
              {project.location} · {PROJECT_STATUS_LABEL[project.status]}
            </p>
          </div>
          <span className="text-accent text-sm font-semibold">View</span>
        </Link>
      </section>

      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="More in this project" href={`/projects/${project.slug}`} />
          <Rail>
            {related.map((listing) => (
              <PropertyCardM key={listing.id} listing={listing} layout="rail" />
            ))}
          </Rail>
        </section>
      )}

      <ActionBar
        enquireHref={`/contact?${enquireQuery}`}
        whatsappMessage={`Hi, I'm interested in ${unit.name} at ${project.name}.`}
      />
    </div>
  );
}

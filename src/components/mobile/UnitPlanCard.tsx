"use client";

import { useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import type { Unit } from "@/content/units";

/**
 * Phone floor-plan card: the key numbers stacked on the left, the plan on
 * the right as a pannable strip (swipe to see the rest), tap to open it
 * full screen in the shared Lightbox. Only fields the unit really has are
 * shown; with no floor plan uploaded it falls back to the numbers alone.
 */
export function UnitPlanCard({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);

  const facts = [
    unit.bedrooms !== undefined ? { label: "Beds", value: String(unit.bedrooms) } : null,
    unit.bathrooms !== undefined ? { label: "Baths", value: String(unit.bathrooms) } : null,
    unit.balconies !== undefined ? { label: "Balconies", value: String(unit.balconies) } : null,
    unit.area ? { label: "Size", value: unit.area } : null,
    { label: "Price", value: unit.price ?? "On request" },
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <section
      aria-labelledby="unit-plan-heading"
      className="bg-surface-raised border-border overflow-hidden rounded-[var(--m-radius-hero)] border"
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 id="unit-plan-heading" className="font-display text-[1.5rem] leading-tight font-bold tracking-tight">
          Floor plan
        </h2>
        {unit.floorPlan && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="View floor plan full screen"
            className="text-accent bg-accent-soft flex size-11 items-center justify-center rounded-full"
          >
            <Maximize2 aria-hidden className="size-5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-4 pb-5 pl-5">
        <dl className="flex w-[30%] shrink-0 flex-col gap-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-body-sm text-fg-subtle">{fact.label}</dt>
              <dd className="font-display mt-0.5 text-[1.375rem] leading-tight font-medium break-words">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {unit.floorPlan && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open floor plan"
            className="no-scrollbar min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
          >
            <span className="relative block h-80 w-[170%]">
              <Media
                ratio="auto"
                containerClassName="absolute inset-0 bg-transparent"
                src={unit.floorPlan.src}
                alt={unit.floorPlan.alt}
                sizes="(min-width: 640px) 60vw, 120vw"
                className="object-contain object-left"
              />
            </span>
          </button>
        )}
      </div>

      {unit.floorPlanFile && (
        <a
          href={unit.floorPlanFile}
          className="border-border text-accent flex h-12 items-center justify-center gap-2 border-t text-sm font-semibold"
        >
          <Download aria-hidden className="size-4" />
          Download floor plan
        </a>
      )}

      {unit.floorPlan && (
        <Lightbox
          images={[unit.floorPlan]}
          index={open ? 0 : null}
          onClose={() => setOpen(false)}
          onNavigate={() => {}}
          label="Floor plan"
          surface="light"
        />
      )}
    </section>
  );
}

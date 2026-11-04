"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { Lightbox } from "@/components/ui/Lightbox";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Same "click to inspect at full size" pattern as the public site's
 * `UnitFloorPlan` — reimplemented here (not imported) because that one is
 * typed against the public CMS's `content/units.ts` shape, while this
 * reads the real, ownership-checked `Unit.layoutImage` from
 * `getOwnerUnitDetail`. Renders nothing when the unit has no floor plan.
 * `<Lightbox>` stays a sibling of `<Reveal>` — see `PropertyGallery`'s
 * comment for why a `<Reveal>` ancestor breaks a `position: fixed` child.
 */
export function PropertyFloorPlan({ src, unitLabel }: { src?: string; unitLabel: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  const alt = `Floor plan for ${unitLabel}`;

  return (
    <>
      <Reveal>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-h4 text-fg">Floor Plan</p>
          <button type="button" onClick={() => setOpen(true)} className="text-button text-accent hover:text-accent-strong inline-flex items-center gap-1.5">
            <Maximize2 aria-hidden className="size-3.5" />
            View Full Screen
          </button>
        </div>
        <button type="button" onClick={() => setOpen(true)} aria-label="View floor plan full screen" className="border-border block w-full border">
          <Media ratio="auto" containerClassName="h-[45vh] sm:h-[55vh]" src={src} alt={alt} sizes="100vw" className="object-contain" />
        </button>
      </Reveal>

      <Lightbox images={[{ src, alt }]} index={open ? 0 : null} onClose={() => setOpen(false)} onNavigate={() => {}} label="Floor plan" surface="light" />
    </>
  );
}

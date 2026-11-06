"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { BlueprintPaper } from "@/components/portal/BlueprintPaper";
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

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        <button type="button" onClick={() => setOpen(true)} aria-label="View floor plan full screen" className="border-border block w-full overflow-hidden rounded-2xl border">
          <BlueprintPaper src={src} alt={alt} className="h-[45vh] sm:h-[55vh]" />
        </button>
      </Reveal>

      {/* Full screen: the same blue paper, the whole drawing. A sibling of <Reveal> on purpose (see the comment above). */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[70] flex flex-col bg-[#10325b] p-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between text-white">
            <p className="text-h4">{unitLabel}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-11 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <BlueprintPaper src={src} alt={alt} className="min-h-0 flex-1 rounded-2xl" />
        </div>
      )}
    </>
  );
}

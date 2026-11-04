"use client";

import { useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import type { Unit } from "@/content/units";

/**
 * The floor plan gets its own full-width section, not a small inline
 * thumbnail — clicking (or the explicit button) opens it in the same
 * <Lightbox> the gallery uses, so it can be inspected at full size.
 * Omits itself entirely when the unit has no floor plan image.
 */
export function UnitFloorPlan({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  if (!unit.floorPlan) return null;

  return (
    <Section spacing="lg">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <Reveal as="p" className="text-label text-fg-subtle uppercase">
            Floor Plan
          </Reveal>
          <Reveal delay={80} className="flex gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-button text-accent inline-flex items-center gap-2"
            >
              <Maximize2 aria-hidden className="size-4" />
              View Full Screen
            </button>
            {unit.floorPlanFile && (
              <a
                href={unit.floorPlanFile}
                className="text-button text-accent inline-flex items-center gap-2"
              >
                <Download aria-hidden className="size-4" />
                Download
              </a>
            )}
          </Reveal>
        </div>

        <Reveal delay={120}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="View floor plan full screen"
            className="border-border-strong bg-surface-raised block w-full border"
          >
            <Media
              ratio="auto"
              containerClassName="h-[60vh] sm:h-[70vh]"
              src={unit.floorPlan.src}
              alt={unit.floorPlan.alt}
              sizes="100vw"
              className="object-contain"
            />
          </button>
        </Reveal>
      </Container>

      <Lightbox
        images={[unit.floorPlan]}
        index={open ? 0 : null}
        onClose={() => setOpen(false)}
        onNavigate={() => {}}
        label="Floor plan"
        surface="light"
      />
    </Section>
  );
}

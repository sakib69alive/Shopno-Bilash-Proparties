"use client";

import { useState } from "react";
import { Download, Maximize2, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { InteractiveRoomPlan, RoomPicker, RoomStage } from "@/components/plan/RoomPlan";
import { ZoomPan } from "@/components/plan/ZoomPan";
import { unitPlanView } from "@/lib/planRooms";
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
  const [roomIds, setRoomIds] = useState<string[]>([]);
  if (!unit.floorPlan) return null;
  // A whole-floor drawing is shown as just THIS flat; rooms are the ones inside it.
  const view = unitPlanView(unit.floorPlanRooms, unit.floorPlanFlat);

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
          {view.plan ? (
            <InteractiveRoomPlan src={unit.floorPlan.src} alt={unit.floorPlan.alt} plan={view.plan} frame={view.frame} />
          ) : (
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
          )}
        </Reveal>
      </Container>

      {view.plan && open && (
        <div role="dialog" aria-modal="true" aria-label="Floor plan" data-no-swipe className="bg-bg fixed inset-0 z-[70] flex flex-col p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-h4">Floor plan</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="border-border bg-surface-raised flex size-11 items-center justify-center rounded-full border">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <ZoomPan label={unit.floorPlan.alt} className="border-border min-h-0 flex-1 rounded-2xl border">
            <div className="flex size-full items-center justify-center p-3">
              <RoomStage src={unit.floorPlan.src} alt={unit.floorPlan.alt} plan={view.plan} frame={view.frame} selectedIds={roomIds} onSelect={setRoomIds} />
            </div>
          </ZoomPan>
          {view.plan.rooms.length > 0 && <RoomPicker plan={view.plan} selectedIds={roomIds} onSelect={setRoomIds} className="mt-3 shrink-0" />}
        </div>
      )}
      <Lightbox
        images={view.plan ? [] : [unit.floorPlan]}
        index={open && !view.plan ? 0 : null}
        onClose={() => setOpen(false)}
        onNavigate={() => {}}
        label="Floor plan"
        surface="light"
      />
    </Section>
  );
}

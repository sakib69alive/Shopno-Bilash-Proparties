"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { BlueprintPaper } from "@/components/portal/BlueprintPaper";
import { RoomPicker, RoomStage } from "@/components/plan/RoomPlan";
import { ZoomPan } from "@/components/plan/ZoomPan";
import { Reveal } from "@/components/ui/Reveal";
import type { PlanHighlight } from "@/lib/unitPlan";
import { doorsOf } from "@/lib/planRooms";

/**
 * Same "click to inspect at full size" pattern as the public site's
 * `UnitFloorPlan` — reimplemented here (not imported) because that one is
 * typed against the public CMS's `content/units.ts` shape, while this
 * reads the real, ownership-checked `Unit.layoutImage` from
 * `getOwnerUnitDetail`. Renders nothing when the unit has no floor plan.
 * `<Lightbox>` stays a sibling of `<Reveal>` — see `PropertyGallery`'s
 * comment for why a `<Reveal>` ancestor breaks a `position: fixed` child.
 *
 * A whole-floor plan shows the owner's flat lit among the others. When the plan has rooms marked, the rooms of THIS flat are buttons under
 * it ("All rooms", "All bedrooms", "Bedroom 1"…): pressing them only makes those rooms glow — the plan never moves. Tapping the plan opens
 * it big, showing just the owner's own flat; there the same buttons bring the plan in close on the rooms pressed.
 */
export function PropertyFloorPlan({ src, unitLabel, highlight }: { src?: string; unitLabel: string; highlight?: PlanHighlight }) {
  const [open, setOpen] = useState(false);
  // The card (whole floor) has its own buttons — flats, lift, stair. Inside the full screen it is this flat's rooms. They never mix.
  const [floorIds, setFloorIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
  const rooms = highlight?.rooms ?? [];
  const roomPlan = highlight ? { aspect: highlight.aspect, rooms } : null;
  const hasRooms = rooms.some((r) => r.type !== "maindoor" && r.type !== "door");
  const floorItems = highlight?.buildingItems ?? [];
  const floorPlanItems = floorItems.length > 0 && highlight ? { aspect: highlight.aspect, rooms: floorItems } : null;

  // The card: the whole floor, the owner's flat lit among the others. Display only — a tap opens the big view.
  const card = (
    <ZoomPan controls={false} label={alt} className="h-[45vh] sm:h-[55vh]">
    <BlueprintPaper src={src} alt={alt} highlight={highlight} className="h-full w-full">
      {highlight && roomPlan ? (
        <RoomStage
          src={src}
          alt={alt}
          plan={{ aspect: highlight.aspect, rooms: [...(floorPlanItems?.rooms ?? []), ...doorsOf(rooms).filter((d) => d.type === "maindoor")] }}
          tone="midnight"
          emphasis={{ mine: highlight.mine, others: highlight.others }}
          view={highlight.view}
          selectedIds={floorIds}
          onSelect={setFloorIds}
          interactive={false}
        />
      ) : undefined}
    </BlueprintPaper>
    </ZoomPan>
  );

  // The big view: with a whole-floor plan, only the owner's own flat, cut out of the drawing.
  const big = highlight && roomPlan ? (
    <ZoomPan label={alt} className="min-h-0 flex-1 rounded-2xl">
    <BlueprintPaper src={src} alt={alt} className="h-full w-full">
      <RoomStage
        src={src}
        alt={alt}
        plan={roomPlan}
        tone="midnight"
        frame={highlight.mine[0]?.points}
        view={highlight.view}
        turn={highlight.mine[0]?.turn}
        fit
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
      />
    </BlueprintPaper>
    </ZoomPan>
  ) : (
    <ZoomPan label={alt} className="min-h-0 flex-1 rounded-2xl">
      <BlueprintPaper src={src} alt={alt} className="h-full w-full" />
    </ZoomPan>
  );

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
          {card}
        </button>
        {floorPlanItems && <RoomPicker plan={floorPlanItems} selectedIds={floorIds} onSelect={setFloorIds} className="mt-5" />}
      </Reveal>

      {/* Full screen. A sibling of <Reveal> on purpose (see the comment above). */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} data-no-swipe className="fixed inset-0 z-[70] flex flex-col bg-[#10325b] p-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between text-white">
            <p className="text-h4">{unitLabel}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-11 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {big}
          {hasRooms && roomPlan && <RoomPicker plan={roomPlan} selectedIds={selectedIds} onSelect={setSelectedIds} className="mt-3 shrink-0 pb-[env(safe-area-inset-bottom)]" />}
        </div>
      )}
    </>
  );
}

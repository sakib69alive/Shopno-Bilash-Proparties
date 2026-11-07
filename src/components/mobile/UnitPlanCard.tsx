"use client";

import { useEffect, useState } from "react";
import { Download, Maximize2, X } from "lucide-react";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { RoomPicker, RoomStage } from "@/components/plan/RoomPlan";
import { ZoomPan } from "@/components/plan/ZoomPan";
import { unitPlanView } from "@/lib/planRooms";
import type { Unit } from "@/content/units";

/**
 * Phone floor-plan card: the key numbers stacked on the left, the plan on
 * the right as a pannable strip (swipe to see the rest), tap to open it
 * full screen in the shared Lightbox. Only fields the unit really has are
 * shown; with no floor plan uploaded it falls back to the numbers alone.
 */
export function UnitPlanCard({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  // A whole-floor drawing is shown as just THIS flat (framed and cut to its outline); rooms are the ones inside it.
  const view = unitPlanView(unit.floorPlanRooms, unit.floorPlanFlat);
  const withRooms = Boolean(unit.floorPlan && view.plan);

  // Full screen for a flat cut out of a whole-floor drawing: only THIS flat (with its room buttons), not the whole floor.
  useEffect(() => {
    if (!open || !withRooms) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, withRooms]);

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
        {unit.floorPlan && !view.plan && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="View floor plan full screen"
            className="text-accent bg-accent-soft flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            <Maximize2 aria-hidden className="size-4" />
            Enlarge
          </button>
        )}
      </div>

      <div className={withRooms ? "mt-4 px-5" : "mt-4 flex gap-4 pb-5 pl-5"}>
        <dl className={withRooms ? "grid grid-cols-3 gap-x-4 gap-y-4" : "flex w-[30%] shrink-0 flex-col gap-4"}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-body-sm text-fg-subtle">{fact.label}</dt>
              <dd className="font-display mt-0.5 text-[1.375rem] leading-tight font-medium break-words">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {unit.floorPlan && view.plan && (
          // Rooms marked and/or a flat outline: the plan fits the card; each room is a button that lifts it off the plan.
          <div className="mt-5 pb-5">
            <div className="border-border relative overflow-hidden rounded-2xl border bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] p-2 [background-size:20px_20px]">
              <RoomStage src={unit.floorPlan.src} alt={unit.floorPlan.alt} plan={view.plan} frame={view.frame} selectedIds={roomIds} onSelect={setRoomIds} />
            </div>
            {view.plan.rooms.length > 0 && <RoomPicker plan={view.plan} selectedIds={roomIds} onSelect={setRoomIds} className="mt-4" onEnlarge={() => setOpen(true)} />}
          </div>
        )}

        {unit.floorPlan && !view.plan && (
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

      {unit.floorPlan && view.plan && open && (
        <div role="dialog" aria-modal="true" aria-label="Floor plan" data-no-swipe className="bg-bg fixed inset-0 z-[70] flex flex-col p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-xl font-bold">Floor plan</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="border-border bg-surface-raised flex size-11 items-center justify-center rounded-full border">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <ZoomPan label={unit.floorPlan.alt} className="border-border min-h-0 flex-1 rounded-2xl border bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:20px_20px]">
            <div className="flex size-full items-center justify-center p-3">
              <RoomStage src={unit.floorPlan.src} alt={unit.floorPlan.alt} plan={view.plan} frame={view.frame} selectedIds={roomIds} onSelect={setRoomIds} />
            </div>
          </ZoomPan>
          {view.plan.rooms.length > 0 && <RoomPicker plan={view.plan} selectedIds={roomIds} onSelect={setRoomIds} className="mt-3 shrink-0" />}
        </div>
      )}

      {unit.floorPlan && !view.plan && (
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

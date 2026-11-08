"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { BlueprintPaper, BLUEPRINT_GRID_STYLE } from "@/components/portal/BlueprintPaper";
import { RoomPicker, RoomStage } from "@/components/plan/RoomPlan";
import { Button } from "@/components/ui/Button";
import { NEUTRAL_VIEW, doorsOf, pressableRooms, roomsInside, type PlanView, type PlanRoom } from "@/lib/planRooms";
import { cn } from "@/lib/utils";
import type { FlatArea } from "@/types/project";

interface PreviewPlan {
  image: string;
  aspect: number;
  areas: FlatArea[];
  rooms: PlanRoom[];
  view: PlanView;
}

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption text-fg-muted flex items-center justify-between">
        {label}
        <span className="text-fg tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-accent w-full" />
    </label>
  );
}

/**
 * What the CLIENT will see, live beside the editor: the My Property page (the whole floor with the owner's flat lit and its room
 * buttons) and the Home card (just that flat). It is built from the very same components the client app uses, fed with the plan exactly
 * as it is being edited now — saved or not — so what you see is what they get. The sliders place the plan however you like: zoom or shift it; nothing is changed in the file, so it can always be reset.
 *
 * `wide` lays it out in two columns (My Property page on the left; Home card and the sliders on the right) for a roomy area such as
 * the Blueprint AI Distribution tab, instead of one tall column.
 */
export function ClientPlanPreview({
  plan,
  onViewChange,
  onAreasChange,
  initialFlatKey,
  wide = false,
  homeView,
  onHomeViewChange,
}: {
  plan: PreviewPlan;
  onViewChange: (view: PlanView) => void;
  onAreasChange: (areas: FlatArea[]) => void;
  /** Zoom / shift of the flat on its Home card (wide mode only — it adds a "Change settings for" switch). */
  homeView?: PlanView;
  onHomeViewChange?: (view: PlanView) => void;
  /** Which flat's owner to preview first (the Distribution tab passes the chosen client's flat). */
  initialFlatKey?: string;
  wide?: boolean;
}) {
  const flats = plan.areas.filter((a) => a.kind !== "parking");
  const [flatKey, setFlatKey] = useState(flats.some((a) => a.key === initialFlatKey) ? (initialFlatKey as string) : (flats[0]?.key ?? ""));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Which of the two client views the sliders change (only offered when the caller can store a separate Home-card placement).
  const [target, setTarget] = useState<"floor" | "home">("floor");
  const split = !!onHomeViewChange;
  // The Floor Plans editor only cares how the flat looks on the client's Home card, so it shows just that (the wide Distribution tab keeps both).
  const homeOnly = split && !wide;
  const activeTarget = homeOnly ? "home" : split ? target : "floor";
  const cardView = homeView ?? { ...NEUTRAL_VIEW };
  const setCard = (patch: Partial<PlanView>) => onHomeViewChange?.({ ...cardView, ...patch });
  const ring = "ring-2 ring-amber-500 ring-offset-2 ring-offset-bg";

  // Keep the chosen flat valid as areas are added or removed.
  useEffect(() => {
    if (flats.length > 0 && !flats.some((a) => a.key === flatKey)) setFlatKey(flats[0].key);
  }, [flats, flatKey]);

  const mine = flats.filter((a) => a.key === flatKey);
  const others = plan.areas.filter((a) => !mine.includes(a));
  const rooms = mine[0] ? roomsInside(plan.rooms, mine[0].points) : [];
  const roomPlan = { aspect: plan.aspect, rooms };
  const view = plan.view;
  const set = (patch: Partial<PlanView>) => onViewChange({ ...view, ...patch });
  const flatTurn = mine[0]?.turn ?? 0;
  const setFlatTurn = (turn: number) => {
    const t = ((((turn + 180) % 360) + 360) % 360) - 180; // keep within −180…180
    onAreasChange(plan.areas.map((a) => (a === mine[0] ? { ...a, turn: t === 0 ? undefined : t } : a)));
  };

  const header = (
    <div>
      <p className="text-body-sm text-fg font-semibold">Live preview — what the client sees</p>
      <p className="text-caption text-fg-muted mt-0.5">Updates as you mark, rename or move things. Press the room buttons to see the animation.</p>
    </div>
  );

  const selector = (
    <label className="text-caption text-fg-muted flex items-center gap-2">
      Preview for the owner of flat
      <select
        value={flatKey}
        onChange={(e) => {
          setFlatKey(e.target.value);
          setSelectedIds([]);
        }}
        className="border-border-strong bg-surface-raised text-body-sm h-8 rounded-md border px-2"
      >
        {flats.map((a) => (
          <option key={a.key} value={a.key}>
            {a.key}
          </option>
        ))}
      </select>
    </label>
  );

  const myProperty = (
    <div>
      <p className="text-caption text-fg-subtle mb-1.5 uppercase">My Property page</p>
      <div className={cn("border-border overflow-hidden rounded-xl border", activeTarget === "floor" && !homeOnly && ring)}>
        <BlueprintPaper src={plan.image} alt="Preview" className="aspect-[4/3]">
          <RoomStage src={plan.image} alt="Preview" plan={roomPlan} tone="midnight" emphasis={{ mine, others }} view={view} selectedIds={selectedIds} onSelect={setSelectedIds} interactive={pressableRooms(rooms).length > 0} />
        </BlueprintPaper>
      </div>
      {pressableRooms(rooms).length > 0 && <RoomPicker plan={roomPlan} selectedIds={selectedIds} onSelect={setSelectedIds} className="mt-3" />}
    </div>
  );

  const homeCard = (
    <div>
      <p className="text-caption text-fg-subtle mb-1.5 uppercase">Home card</p>
      <div style={BLUEPRINT_GRID_STYLE} className={cn("relative mx-auto aspect-[4/5] w-full max-w-[16rem] overflow-hidden rounded-[1.75rem]", split && activeTarget === "home" && !homeOnly && ring)}>
        <div className="absolute inset-0 flex items-center px-3">
          {mine[0] && <RoomStage src={plan.image} alt="Preview" plan={{ aspect: plan.aspect, rooms: doorsOf(rooms).filter((d) => d.type === "maindoor") }} frame={mine[0].points} view={view} cardView={split ? cardView : undefined} turn={flatTurn} tone="blue" selectedIds={[]} onSelect={() => {}} interactive={false} />}
        </div>
      </div>
    </div>
  );

  const targetSwitch = split && !homeOnly && (
    <div className="flex flex-col gap-1.5">
      <p className="text-body-sm text-fg font-semibold">Change settings for</p>
      <div role="tablist" className="bg-surface border-border grid grid-cols-2 gap-1 rounded-full border p-1">
        {(
          [
            { key: "floor", label: "My Property page" },
            { key: "home", label: "Home card" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTarget === t.key}
            onClick={() => setTarget(t.key)}
            className={cn("text-body-sm h-9 rounded-full px-3 font-semibold transition-colors", activeTarget === t.key ? "bg-accent text-accent-foreground" : "text-fg-muted hover:text-fg")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-caption text-fg-subtle">The outlined picture is the one the sliders below are changing.</p>
    </div>
  );

  const homeControls = (
    <div className="flex flex-col gap-3">
      {mine[0] && (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm text-fg font-semibold">Turn flat {flatKey}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFlatTurn(flatTurn - 90)}>
              <RotateCcw aria-hidden className="size-4" />
              Turn left
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setFlatTurn(flatTurn + 90)}>
              <RotateCw aria-hidden className="size-4" />
              Turn right
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFlatTurn(0)}>
              Reset
            </Button>
          </div>
          <Slider label="Fine angle" value={flatTurn} min={-180} max={180} step={0.5} unit="°" onChange={setFlatTurn} />
        </div>
      )}
      <Slider label="Zoom" value={cardView.zoom} min={0.5} max={1.8} step={0.05} unit="×" onChange={(v) => setCard({ zoom: v })} />
      <Slider label="Shift left / right" value={cardView.x} min={-40} max={40} step={1} unit="%" onChange={(v) => setCard({ x: v })} />
      <Slider label="Shift up / down" value={cardView.y} min={-40} max={40} step={1} unit="%" onChange={(v) => setCard({ y: v })} />
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onHomeViewChange?.({ ...NEUTRAL_VIEW })}>
          <RotateCcw aria-hidden className="size-4" />
          Reset Home card zoom &amp; shift
        </Button>
      </div>
    </div>
  );

  const controls = (
    <div className={cn("flex flex-col gap-3", !wide && "border-border border-t pt-3")}>
      {targetSwitch}
      {split && activeTarget === "home" ? homeControls : null}
      {split && activeTarget === "home" ? null : mine[0] && !split && (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm text-fg font-semibold">Turn flat {flatKey} on its own (Home card)</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFlatTurn(flatTurn - 90)}>
              <RotateCcw aria-hidden className="size-4" />
              Turn left
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setFlatTurn(flatTurn + 90)}>
              <RotateCw aria-hidden className="size-4" />
              Turn right
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFlatTurn(0)}>
              Reset
            </Button>
          </div>
          <Slider label="Fine angle" value={flatTurn} min={-180} max={180} step={0.5} unit="°" onChange={setFlatTurn} />
          <p className="text-caption text-fg-subtle">Only this flat on the Home card turns — the whole-floor views and the other flats stay as they are.</p>
        </div>
      )}
      {!(split && activeTarget === "home") && (
        <>
          <p className="text-body-sm text-fg font-semibold">Place the My Property page picture</p>
          <Slider label="Zoom" value={view.zoom} min={0.5} max={1.8} step={0.05} unit="×" onChange={(v) => set({ zoom: v })} />
          <Slider label="Shift left / right" value={view.x} min={-40} max={40} step={1} unit="%" onChange={(v) => set({ x: v })} />
          <Slider label="Shift up / down" value={view.y} min={-40} max={40} step={1} unit="%" onChange={(v) => set({ y: v })} />
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onViewChange({ ...NEUTRAL_VIEW })}>
              <RotateCcw aria-hidden className="size-4" />
              Reset placement
            </Button>
          </div>
          <p className="text-caption text-fg-subtle">
            {split ? "These move the whole-floor picture (My Property page). The Home card has its own settings — switch above." : "Zoom and shift move only the outlined My Property page picture above. The Home card is turned with “Turn left / right”; its own zoom and shift are in the Blueprint AI Distribution tab."}
          </p>
        </>
      )}
    </div>
  );

  if (wide && flats.length > 0) {
    return (
      <div className="bg-bg border-border flex flex-col gap-4 rounded-lg border p-4">
        {header}
        {selector}
        <div className="grid grid-cols-2 items-start gap-6">
          {myProperty}
          <div className="flex flex-col gap-5">
            {homeCard}
            {controls}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg border-border flex flex-col gap-4 rounded-lg border p-3">
      {header}
      {flats.length === 0 ? (
        <p className="text-body-sm text-fg-subtle">Mark at least one flat to see how it looks for its owner.</p>
      ) : (
        <>
          {selector}
          {!homeOnly && myProperty}
          {homeCard}
        </>
      )}
      {controls}
    </div>
  );
}

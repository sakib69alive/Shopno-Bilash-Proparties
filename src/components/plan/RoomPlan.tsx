"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Layers, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { doorBelongsTo, doorsOf, planViewTransform, polygonCentroid, pressableRooms, roomSummary, ROOM_TYPE_LABEL, ROOM_TYPES, type PlanRoom, type PlanRooms, type PlanView, type RoomType } from "@/lib/planRooms";
import type { FlatArea } from "@/types/project";

/**
 * The ONE room experience, used everywhere a plan has rooms (public project blueprints, public unit pages on phone and computer, the
 * client app's Home and flat pages). Press a room — or "All bedrooms", "All rooms" — and those rooms lift off the plan, grow a little
 * with a soft shadow, go darker and bolder, while everything else fades back. Keep using these components for any new place that
 * shows rooms, so the behaviour and the animation stay identical across the whole product.
 */

// "Zoom in on what I press" — a tick the visitor can set beside every plan. OFF unless they tick it; one tick covers every plan on the page,
// so the behaviour is the same wherever rooms are shown.
let zoomPreference = false;
const zoomListeners = new Set<() => void>();
function useRoomZoom(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      zoomListeners.add(cb);
      return () => zoomListeners.delete(cb);
    },
    () => zoomPreference,
    () => false,
  );
  return [
    value,
    (next) => {
      zoomPreference = next;
      zoomListeners.forEach((fn) => fn());
    },
  ];
}

/** The tick itself — shown by every RoomPicker. */
function ZoomTick({ className }: { className?: string }) {
  const [zoom, setZoom] = useRoomZoom();
  return (
    <label className={cn("text-body-sm text-fg-muted flex w-fit cursor-pointer items-center justify-start gap-2 self-start text-left select-none", className)}>
      <input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} className="accent-accent size-4" />
      Zoom in on what I press
    </label>
  );
}

export type RoomTone = "paper" | "blue" | "midnight";

const TONES = {
  paper: {
    veil: "var(--color-surface-raised)",
    liftBg: "color-mix(in srgb, var(--color-accent) 9%, var(--color-surface-raised))",
    stroke: "var(--color-accent)",
    imgFilter: "",
    shadow: "drop-shadow(0 10px 12px rgb(0 0 0 / 0.32))",
    tagBg: "var(--color-accent)",
    tagText: "var(--color-accent-foreground)",
  },
  // White lines on the client app's blue sheet.
  blue: {
    veil: "rgb(29 90 166)",
    liftBg: "rgb(65 116 180)",
    stroke: "#ffd678",
    imgFilter: "invert(1)",
    shadow: "drop-shadow(0 10px 12px rgb(0 0 0 / 0.38))",
    tagBg: "#ffd678",
    tagText: "#10325b",
  },
  // The deep midnight sheet of the My Property pages (see BlueprintPaper).
  midnight: {
    veil: "rgb(13 37 64)",
    liftBg: "rgb(34 74 118)",
    stroke: "#ffd678",
    imgFilter: "invert(1) sepia(0.18)",
    shadow: "drop-shadow(0 10px 12px rgb(0 0 0 / 0.5))",
    tagBg: "#ffd678",
    tagText: "#10325b",
  },
} as const;

// Door colours — chosen to stand apart from the plan's own white/ink lines AND from the yellow outline of a pressed room.
const DOOR_COLORS: Record<RoomTone, { main: string; room: string }> = {
  paper: { main: "#16a34a", room: "#e11d48" },
  blue: { main: "#3df09a", room: "#ff5c8a" },
  midnight: { main: "#3df09a", room: "#ff5c8a" },
};

const polygonClip = (points: [number, number][]) => `polygon(${points.map(([x, y]) => `${+(x * 100).toFixed(2)}% ${+(y * 100).toFixed(2)}%`).join(", ")})`;
const polygonAttr = (points: [number, number][]) => points.map(([x, y]) => `${+(x * 100).toFixed(2)},${+(y * 100).toFixed(2)}`).join(" ");

function bounds(points: [number, number][]): { x0: number; y0: number; x1: number; y1: number } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Selection rules shared by every screen: a room chip selects just that room (press again to put it back); a group chip selects the whole group. */
export function toggleRoom(current: string[], id: string): string[] {
  return current.length === 1 && current[0] === id ? [] : [id];
}
export function toggleGroup(current: string[], ids: string[]): string[] {
  const same = current.length === ids.length && ids.every((id) => current.includes(id));
  return same ? [] : ids;
}

/**
 * A floor plan whose rooms can be pressed. The drawing and the room shapes live in one box with the drawing's own proportions, so they
 * line up exactly on any screen. `frame` shows only part of the drawing — one flat's outline — as if that flat had its own plan.
 */
export function RoomStage({
  src,
  alt,
  plan,
  selectedIds,
  onSelect,
  frame,
  tone = "paper",
  veilColor,
  interactive = true,
  view,
  turn,
  cardView,
  emphasis,
  fit,
  peek,
  className,
}: {
  src: string;
  alt: string;
  plan: PlanRooms;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  /** Outline of the one flat to show (0–1 fractions). Everything outside it is cut away. */
  frame?: [number, number][];
  tone?: RoomTone;
  /** Overrides the colour that fades the rest of the plan (e.g. the cream paper of the client app). */
  veilColor?: string;
  /** false = display only (no press targets) — for a stage that sits inside a button, like the client Home card. */
  interactive?: boolean;
  /** The admin's own tilt / zoom / shift of this plan (client app). A framed plan (one flat) only uses the tilt. */
  view?: PlanView;
  /** A whole-floor plan with ONE flat lit: the flat's outline glows, the other flats are veiled. */
  emphasis?: { mine: FlatArea[]; others: FlatArea[] };
  /** Extra degrees this ONE flat is turned (framed views only — the Home card). Quarter turns swap the card's shape; any angle works. */
  turn?: number;
  /** The admin's own zoom / shift of ONE flat on its card (framed views only — the Home card). Separate from `view`, which places the whole floor. */
  cardView?: PlanView;
  /** Fit the whole plan inside its parent, both ways (the parent must be a size container) — for a full-screen view, so a tall or wide plan is never cut off. */
  fit?: boolean;
  /** A teaser: draw the plan so only this share of its width (e.g. 0.75) fits the parent, the rest running off the right edge to invite a tap. Parent must be a size container, left-aligned. */
  peek?: number;
  className?: string;
}) {
  const t = TONES[tone];
  // Doors travel with the rooms but are only drawn, never pressed (see DOOR_TYPES in lib/planRooms).
  const allDoors = doorsOf(plan.rooms);
  plan = { ...plan, rooms: pressableRooms(plan.rooms) };
  const selected = plan.rooms.filter((r) => selectedIds.includes(r.id));
  // The flat's main door is always shown (on a whole-floor card with one flat lit: only that flat's own door). A room's door is shown while that room is selected.
  const ownFlats = emphasis?.mine.filter((a) => a.points.length >= 3) ?? [];
  const doorsToDraw = allDoors.filter((d, i, all) => {
    if (all.findIndex((x) => x.id === d.id) !== i) return false; // the same door can arrive twice (card + shared items)
    if (d.type === "maindoor") return !emphasis || ownFlats.some((a) => doorBelongsTo(d, a.points));
    return selected.some((r) => doorBelongsTo(d, r.points));
  });
  const doorColors = DOOR_COLORS[tone];

  // Only when the visitor has ticked "Zoom in on what I press": the plan glides to centre the pressed rooms and magnifies them.
  const [zoomOn] = useRoomZoom();

  // The window onto the drawing: the whole thing, or just the chosen flat (plus a small margin).
  let win = { x0: 0, y0: 0, x1: 1, y1: 1 };
  let clip: string | undefined;
  if (frame && frame.length >= 3) {
    const b = bounds(frame);
    const mx = (b.x1 - b.x0) * 0.025;
    const my = (b.y1 - b.y0) * 0.025;
    win = { x0: Math.max(0, b.x0 - mx), y0: Math.max(0, b.y0 - my), x1: Math.min(1, b.x1 + mx), y1: Math.min(1, b.y1 + my) };
    const [cx, cy] = polygonCentroid(frame);
    // grown a hair so a slightly tight outline never shaves a wall
    clip = polygonClip(frame.map(([x, y]) => [Math.min(1, Math.max(0, cx + (x - cx) * 1.035)), Math.min(1, Math.max(0, cy + (y - cy) * 1.035))] as [number, number]));
  }
  const fw = win.x1 - win.x0;
  const fh = win.y1 - win.y0;
  const frameAspect = (fw * plan.aspect) / fh;
  const wcx = (win.x0 + win.x1) / 2;
  const wcy = (win.y0 + win.y1) / 2;
  const framed = fw < 0.999 || fh < 0.999;
  // A framed flat can be turned: the plan-wide tilt plus this flat's own turn. The quarter-turn part swaps the card's proportions (a flat
  // drawn sideways stands upright in a tall card); the small remainder is a tilt that shrinks just enough to stay inside.
  const totalTurn = framed ? (view?.tilt ?? 0) + (turn ?? 0) : 0;
  const quarter = Math.round(totalTurn / 90) * 90;
  const rem = totalTurn - quarter;
  const swapped = framed && Math.abs(quarter) % 180 === 90;
  const rootAspect = swapped ? 1 / frameAspect : frameAspect;

  // Zoom onto the pressed rooms (phones only).
  let zoom = 1;
  let ux = wcx;
  let uy = wcy;
  if (selected.length > 0) {
    const b = bounds(selected.flatMap((r) => r.points));
    ux = (b.x0 + b.x1) / 2;
    uy = (b.y0 + b.y1) / 2;
    if (zoomOn) {
      const w = Math.max(0.04, b.x1 - b.x0) / fw;
      const h = Math.max(0.04, b.y1 - b.y0) / fh;
      zoom = Math.min(3.2, Math.max(1, Math.min(0.66 / w, 0.66 / h)));
    }
  }

  const frameBox: CSSProperties = framed
    ? { position: "absolute", left: `${(-win.x0 / fw) * 100}%`, top: `${(-win.y0 / fh) * 100}%`, width: `${100 / fw}%`, height: `${100 / fh}%` }
    : { position: "absolute", inset: 0 };
  const baseImgStyle: CSSProperties = { filter: t.imgFilter || undefined, clipPath: clip };

  const viewTransform = framed ? undefined : planViewTransform(view, rootAspect, false);
  const remFit = rem === 0 ? 1 : (() => {
    const t = (rem * Math.PI) / 180;
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    return Math.min(1 / (c + s / frameAspect), 1 / frameAspect / (s + c / frameAspect));
  })();
  const cardZoom = framed ? (cardView?.zoom ?? 1) : 1;
  const cardX = framed ? (cardView?.x ?? 0) : 0;
  const cardY = framed ? (cardView?.y ?? 0) : 0;
  const cardScale = remFit * cardZoom;
  const turnBox: CSSProperties | undefined = framed
    ? {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: swapped ? "100cqh" : "100cqw",
        height: swapped ? "100cqw" : "100cqh",
        transform: `translate(-50%, -50%)${cardX !== 0 || cardY !== 0 ? ` translate(${cardX}cqw, ${cardY}cqh)` : ""} rotate(${quarter + rem}deg)${cardScale !== 1 ? ` scale(${cardScale.toFixed(4)})` : ""}`,
      }
    : undefined;

  return (
    <div className={cn("relative mx-auto w-full overflow-hidden select-none", framed && "[container-type:size]", className)} style={{ aspectRatio: String(rootAspect), ...(fit ? { width: `min(100cqw, calc(100cqh * ${rootAspect}))` } : null), ...(peek ? { width: `min(calc(100cqw / ${peek}), calc(115cqh * ${rootAspect}))`, flexShrink: 0 } : null) }}>
      <div className={turnBox ? undefined : "absolute inset-0"} style={turnBox ?? { transform: viewTransform, transformOrigin: "50% 50%" }}>
      <div style={frameBox}>
        <div
          className="absolute inset-0 transition-transform duration-[1200ms] ease-[cubic-bezier(0.25,0.7,0.25,1)]"
          style={{
            transformOrigin: `${wcx * 100}% ${wcy * 100}%`,
            transform: selected.length > 0 && zoom > 1 ? `scale(${zoom.toFixed(3)}) translate(${((wcx - ux) * 100).toFixed(2)}%, ${((wcy - uy) * 100).toFixed(2)}%)` : "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- plain img: an uploaded drawing, laid exactly under the room shapes */}
          <img src={src} alt={alt} draggable={false} style={baseImgStyle} className={cn("absolute inset-0 size-full object-contain", tone === "blue" && "mix-blend-screen")} />

          {/* A whole-floor plan with one flat lit: the others are veiled, this one glows. */}
          {emphasis && (
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
              {emphasis.others.filter((a) => a.points.length >= 3).map((a, i) => (
                <polygon key={`o-${i}`} points={polygonAttr(a.points)} fill={veilColor ?? t.veil} fillOpacity={0.66} />
              ))}
              {emphasis.mine.filter((a) => a.points.length >= 3).map((a, i) => (
                <polygon key={`m-${i}`} points={polygonAttr(a.points)} fill="rgb(255 214 120 / 0.18)" stroke="#ffd678" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          )}

          {/* Everything that is not a chosen room fades back. */}
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 transition-opacity duration-300", selected.length > 0 ? "opacity-[0.7]" : "opacity-0")}
            style={{ backgroundColor: veilColor ?? t.veil, clipPath: clip }}
          />

          {selected.map((room) => {
            const [cx, cy] = polygonCentroid(room.points);
            return (
              <div key={room.id} aria-hidden className="pointer-events-none absolute inset-0" style={{ filter: t.shadow }}>
                <div className="room-lift absolute inset-0" style={{ clipPath: polygonClip(room.points), transformOrigin: `${cx * 100}% ${cy * 100}%`, backgroundColor: t.liftBg }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- same drawing again, clipped to the room */}
                  <img src={src} alt="" draggable={false} style={{ filter: t.imgFilter || undefined }} className="absolute inset-0 size-full object-contain" />
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
                    <polygon points={polygonAttr(room.points)} fill="none" stroke={t.stroke} strokeWidth={3.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>
            );
          })}

          {/* Doors: the flat's main door in its own colour at all times, a room's door in another colour while that room is pressed. A thin soft halo
              behind a solid line the length of the door itself — it grows and shrinks with the plan, so it always matches the door. */}
          {doorsToDraw.length > 0 && (
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
              {doorsToDraw.map((d) => {
                const color = d.type === "maindoor" ? doorColors.main : doorColors.room;
                const [[x1, y1], [x2, y2]] = [d.points[0], d.points[1]];
                return (
                  <g key={d.id} className="door-glow" strokeLinecap="round">
                    <line x1={x1 * 100} y1={y1 * 100} x2={x2 * 100} y2={y2 * 100} stroke={color} strokeOpacity={0.32} strokeWidth={d.type === "maindoor" ? 11 : 9} vectorEffect="non-scaling-stroke" />
                    <line x1={x1 * 100} y1={y1 * 100} x2={x2 * 100} y2={y2 * 100} stroke={color} strokeWidth={d.type === "maindoor" ? 5 : 4} vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </svg>
          )}

          {/* The press targets — one transparent shape per room, above everything. */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("absolute inset-0 size-full", !interactive && "pointer-events-none")}>
            {interactive && plan.rooms.map((room) => (
              <polygon
                key={room.id}
                points={polygonAttr(room.points)}
                role="button"
                tabIndex={-1}
                aria-label={room.label}
                onClick={(e) => {
                  onSelect(toggleRoom(selectedIds, room.id));
                  // no lingering focus ring or tap highlight on the pressed shape
                  (e.currentTarget as SVGElement).blur();
                }}
                onMouseDown={(e) => e.preventDefault()}
                focusable="false"
                className="fill-transparent outline-none transition-colors [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline-none [@media(hover:hover)]:hover:fill-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]"
                style={{ cursor: "pointer", pointerEvents: "all", outline: "none", WebkitTapHighlightColor: "transparent" }}
              />
            ))}
          </svg>
        </div>
      </div>
      </div>
    </div>
  );
}

function RoomButton({ room, active, onClick }: { room: PlanRoom; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 touch-manipulation rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 [-webkit-tap-highlight-color:transparent] active:scale-95",
        active ? "bg-accent text-accent-foreground border-transparent shadow-md" : "bg-surface-raised border-border text-fg hover:border-fg-subtle",
      )}
    >
      {room.label}
    </button>
  );
}

/** "All rooms" / "All bedrooms" — selects the whole group at once. */
function GroupButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 [-webkit-tap-highlight-color:transparent] active:scale-95",
        active ? "bg-fg text-bg border-transparent shadow-md" : "bg-surface border-fg/50 text-fg hover:border-fg",
      )}
    >
      <Layers aria-hidden className="size-3.5" />
      {label}
      <span className={cn("tabular-nums", active ? "opacity-80" : "text-fg-subtle")}>{count}</span>
    </button>
  );
}

function groupLabel(type: RoomType, count: number): string {
  return `All ${count === 1 ? ROOM_TYPE_LABEL[type].one : ROOM_TYPE_LABEL[type].many}`;
}

/**
 * The room buttons. Phone: a row of group buttons ("All rooms", "All bedrooms 4", "All balconies 2"…) above a sideways-scrolling row
 * of single rooms. Computer: a tidy column grouped by kind, each group with its own "Show all". Selecting is shared with the plan.
 */
export function RoomPicker({ plan: fullPlan, selectedIds, onSelect, className, onEnlarge }: { plan: PlanRooms; selectedIds: string[]; onSelect: (ids: string[]) => void; className?: string; onEnlarge?: () => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  // Doors are drawn on the plan but are not buttons.
  const plan = { ...fullPlan, rooms: pressableRooms(fullPlan.rooms) };
  const summary = roomSummary(plan.rooms);
  const all = plan.rooms.map((r) => r.id);
  const idsOf = (type: RoomType) => plan.rooms.filter((r) => r.type === type).map((r) => r.id);
  const is = (ids: string[]) => ids.length === selectedIds.length && ids.every((id) => selectedIds.includes(id));

  useEffect(() => {
    if (selectedIds.length !== 1) return;
    const el = rowRef.current?.querySelector<HTMLElement>(`[data-room-id="${CSS.escape(selectedIds[0])}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selectedIds]);

  // A group button for "other spaces" would be meaningless; the "all" button already covers them.
  const groups = summary.filter((s) => s.count >= 2 && s.type !== "other");
  // A building floor (flats, lift, stairs) has no "rooms"; a flat's plan does.
  const allLabel = plan.rooms.some((r) => ["bedroom", "living", "dining", "kitchen", "bathroom", "balcony", "servant", "store"].includes(r.type)) ? "All rooms" : "Show all";

  if (plan.rooms.length === 0) return null; // only doors marked: nothing to press

  return (
    <div className={className}>
      {/* Phone / tablet */}
      <div className="lg:hidden">
        <p className="text-body-sm text-fg-muted mb-3">{summary.map((s) => s.text).join(" · ")}</p>
        {plan.rooms.length >= 2 && (
          <div className="no-scrollbar -mx-[var(--gutter,1rem)] mb-2.5 flex gap-2 overflow-x-auto px-[var(--gutter,1rem)]">
            <GroupButton label={allLabel} count={all.length} active={is(all)} onClick={() => onSelect(toggleGroup(selectedIds, all))} />
            {groups.map((g) => (
              <GroupButton key={g.type} label={groupLabel(g.type, g.count)} count={g.count} active={is(idsOf(g.type))} onClick={() => onSelect(toggleGroup(selectedIds, idsOf(g.type)))} />
            ))}
          </div>
        )}
        <div ref={rowRef} className="no-scrollbar -mx-[var(--gutter,1rem)] flex snap-x gap-2 overflow-x-auto px-[var(--gutter,1rem)] pb-1 [scroll-padding-inline:var(--gutter,1rem)]">
          {plan.rooms.map((room) => (
            <span key={room.id} data-room-id={room.id} className="snap-start">
              <RoomButton room={room} active={selectedIds.includes(room.id)} onClick={() => onSelect(toggleRoom(selectedIds, room.id))} />
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <ZoomTick />
          {onEnlarge && (
            <button type="button" onClick={onEnlarge} aria-label="Enlarge floor plan" className="bg-accent-soft text-accent flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold">
              <Maximize2 aria-hidden className="size-4" />
              Enlarge
            </button>
          )}
        </div>
      </div>

      {/* Computer */}
      <div className="hidden lg:block">
        <p className="text-label text-fg-subtle uppercase">Explore the plan</p>
        <p className="text-body-sm text-fg-muted mt-1.5">Press one — or press it on the plan — to bring it forward.</p>
        <ZoomTick className="mt-3" />
        {plan.rooms.length >= 2 && (
          <div className="mt-4">
            <GroupButton label={allLabel} count={all.length} active={is(all)} onClick={() => onSelect(toggleGroup(selectedIds, all))} />
          </div>
        )}
        <div className="mt-5 flex flex-col gap-5">
          {ROOM_TYPES.map((type) => {
            const rooms = plan.rooms.filter((r) => r.type === type);
            if (rooms.length === 0) return null;
            const ids = rooms.map((r) => r.id);
            return (
              <div key={type}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-body-sm text-fg flex items-baseline gap-2 font-semibold capitalize">
                    {rooms.length === 1 ? ROOM_TYPE_LABEL[type].one : ROOM_TYPE_LABEL[type].many}
                    <span className="text-fg-subtle text-caption font-normal">{rooms.length}</span>
                  </p>
                  {rooms.length >= 2 && (
                    <button type="button" aria-pressed={is(ids)} onClick={() => onSelect(toggleGroup(selectedIds, ids))} className={cn("text-caption font-semibold transition-colors", is(ids) ? "text-fg" : "text-accent hover:text-accent-strong")}>
                      {is(ids) ? "Hide all" : "Show all"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {rooms.map((room) => (
                    <RoomButton key={room.id} room={room} active={selectedIds.includes(room.id)} onClick={() => onSelect(toggleRoom(selectedIds, room.id))} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Stage + buttons together, with their own selection — for pages that show a single plan. */
export function InteractiveRoomPlan({ src, alt, plan, frame, stageClassName, children }: { src: string; alt: string; plan: PlanRooms; frame?: [number, number][]; stageClassName?: string; children?: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <div className="border-border-strong bg-surface-raised overflow-hidden border p-3 sm:p-5">
          <RoomStage src={src} alt={alt} plan={plan} frame={frame} selectedIds={selectedIds} onSelect={setSelectedIds} className={stageClassName} />
        </div>
        {children}
      </div>
      {plan.rooms.length > 0 && <RoomPicker plan={plan} selectedIds={selectedIds} onSelect={setSelectedIds} className="lg:sticky lg:top-28" />}
    </div>
  );
}

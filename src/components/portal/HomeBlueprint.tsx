"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Compass, Maximize2, X } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { cn } from "@/lib/utils";
import { useHomeFlat } from "@/components/portal/HomeFlatSelection";
import { BLUEPRINT_GRID_STYLE, BLUEPRINT_LIGHT_LINE_STYLE, BLUEPRINT_LIGHT_STYLE } from "@/components/portal/BlueprintPaper";
import { RoomPicker, RoomStage } from "@/components/plan/RoomPlan";
import { ZoomPan } from "@/components/plan/ZoomPan";
import type { PlanHighlight } from "@/lib/unitPlan";

export interface HomeBlueprintUnit {
  id: string;
  unitNumber: string;
  projectName: string;
  layoutImage?: string;
  /** Set when the plan is the whole floor: the owner's flat is lit up and the others dimmed. */
  highlight?: PlanHighlight;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  sizeSqft: number;
  facing?: string;
}

function Facts({ unit, className }: { unit: HomeBlueprintUnit; className?: string }) {
  const facts = [
    { label: "Beds", value: String(unit.bedrooms) },
    { label: "Baths", value: String(unit.bathrooms) },
    { label: "Balconies", value: String(unit.balconies) },
    { label: "Size sqft", value: unit.sizeSqft.toLocaleString("en-US") },
  ];
  return (
    <dl className={className}>
      {facts.map((f) => (
        <div key={f.label}>
          <dt className="text-fg-subtle text-[0.8125rem]">{f.label}</dt>
          <dd className="font-display text-fg mt-0.5 text-[1.75rem] leading-none font-medium tracking-tight">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const DOTS_TEXTURE = {
  backgroundImage:
    "radial-gradient(circle, var(--color-border-strong) 1px, transparent 1px), radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 70%)",
  backgroundSize: "28px 28px, 100% 100%",
};

const PAPER = "bg-[#f3efe5]";

/**
 * Phone-only first screen of the owner portal home: the owner's own flat —
 * its number, the key figures down the left and the blueprint beside it,
 * running off the right edge of the screen. Tap the blueprint and it opens
 * full screen (swipe sideways to pan across the whole plan; with several
 * flats, swipe between flats). Only real data is shown; a flat with no
 * uploaded plan still gets its numbers and a note instead of a blank.
 */
/**
 * How far the flat is turned on the phone. The admin's own turn wins; otherwise a flat drawn wide (landscape) is turned a quarter so it
 * stands upright in the tall card and fills it, instead of floating small in the middle with empty space above and below.
 */
function homeTurn(h: PlanHighlight): number | undefined {
  const area = h.mine[0];
  if (!area) return undefined;
  if (area.turn !== undefined && area.turn !== 0) return area.turn;
  const xs = area.points.map((p) => p[0]);
  const ys = area.points.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const hgt = Math.max(...ys) - Math.min(...ys);
  if (hgt <= 0) return undefined;
  return (w * h.aspect) / hgt > 1.25 ? 90 : undefined;
}

export function HomeBlueprint({ units, firstName, className, blue = false, grid = false }: { units: HomeBlueprintUnit[]; firstName?: string; className?: string; blue?: boolean; grid?: boolean }) {
  const sheetStyle = blue ? (grid ? BLUEPRINT_GRID_STYLE : BLUEPRINT_LIGHT_STYLE) : undefined;
  const [open, setOpen] = useState(false);
  // Rooms pressed in the full-screen view, per residence (the Home card itself has no room buttons).
  const [roomSel, setRoomSel] = useState<Record<string, string[]>>({});
  const { selectedId, select } = useHomeFlat();
  const selectedIndex = Math.max(0, units.findIndex((u) => u.id === selectedId));
  const [page, setPage] = useState(selectedIndex);
  const pagerRef = useRef<HTMLDivElement>(null);

  // Several flats: swipe the plan sideways to move between them, or tap the flat number to pick from a list.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dir, setDir] = useState(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  function go(delta: number) {
    const n = units.length;
    if (n < 2) return;
    setDir(delta);
    select(units[(selectedIndex + delta + n) % n].id);
  }

  // Opening the full-screen viewer starts on the flat chosen at the top.
  useEffect(() => {
    if (!open) return;
    const el = pagerRef.current;
    if (el) el.scrollTo({ left: selectedIndex * el.clientWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (units.length === 0) return null;
  const first = units[selectedIndex] ?? units[0];

  function onScroll() {
    const el = pagerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setPage((c) => (c === next ? c : next));
    if (units[next]) select(units[next].id);
  }

  return (
    <>
      <section className={cn("flex min-h-0 flex-col lg:hidden", className)}>
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Left column: who, which flat, and its numbers. The plan beside it rises all the way to the top of the screen. */}
          <div key={first.id} style={{ "--swap-from": `${dir * -16}px` } as React.CSSProperties} className="flat-swap flex w-[7.25rem] shrink-0 flex-col justify-between gap-6">
            <div>
              {firstName && (
                <>
                  <p className="text-accent text-[0.625rem] font-semibold tracking-[0.22em] uppercase">Welcome back</p>
                  <p className="font-serif-display text-fg mt-1 text-[2rem] leading-none break-words">{firstName}</p>
                </>
              )}
              <p className={cn("text-accent text-[0.5625rem] font-semibold tracking-[0.12em] whitespace-nowrap uppercase", firstName && "mt-6")}>
                {units.length > 1 ? `Residence ${selectedIndex + 1} of ${units.length}` : "Your residence"}
              </p>
              {units.length > 1 ? (
                <button type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-label={`Unit ${first.unitNumber}. Choose another residence`} className="group mt-1 flex items-center gap-1.5 text-left">
                  <span className="font-serif-display text-fg text-[2rem] leading-none">{first.unitNumber}</span>
                  <span className="bg-surface text-fg-muted flex size-6 items-center justify-center rounded-full transition-transform group-active:scale-90">
                    <ChevronDown aria-hidden className="size-3.5" />
                  </span>
                </button>
              ) : (
                <p className="font-serif-display text-fg mt-1 text-[2rem] leading-none">{first.unitNumber}</p>
              )}
            </div>
            <div>
              <Facts unit={first} className="flex flex-col gap-5" />
              <p className="text-fg-subtle mt-5 inline-flex items-start gap-1.5 text-xs">
                <Compass aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {first.projectName}
              </p>
            </div>
          </div>

          {/* The plan runs off the right edge of the screen (the page gutter is cancelled on this side); tap for full screen. */}
          <button
            type="button"
            style={sheetStyle}
            onClick={() => {
              if (swiped.current) {
                swiped.current = false;
                return;
              }
              setOpen(true);
            }}
            onTouchStart={(e) => {
              touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              swiped.current = false;
            }}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start) return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                swiped.current = true;
                go(dx < 0 ? 1 : -1);
              }
            }}
            aria-label={`Open the blueprint of unit ${first.unitNumber} full screen`}
            className={cn(
              "relative isolate -mr-[var(--gutter)] min-h-[26rem] min-w-0 flex-1 overflow-hidden rounded-l-[2rem] transition-transform duration-150 active:scale-[0.99]",
              !blue && PAPER,
            )}
          >
            <div key={first.id} style={{ "--swap-from": `${dir * 36}px` } as React.CSSProperties} className="flat-swap absolute inset-0">
            {first.layoutImage && first.highlight ? (
              // The flat on its own — cut out of the whole-floor drawing — with the same room animation as everywhere else.
              /* 2 grid squares (12px each) of empty sheet all round the plan on the card — nothing sits in that margin. The plan runs a quarter off the right edge on purpose: a teaser that invites a tap. */
              <div className="absolute inset-0 flex items-center justify-start p-6 [container-type:size]">
                <RoomStage
                  src={first.layoutImage}
                  alt={`Floor plan of unit ${first.unitNumber}`}
                  plan={{ aspect: first.highlight.aspect, rooms: [] }}
                  frame={first.highlight.mine[0]?.points}
                  view={first.highlight.view}
                  cardView={first.highlight.homeView}
                  turn={homeTurn(first.highlight)}
                  peek={0.75}
                  selectedIds={[]}
                  onSelect={() => {}}
                  tone={blue ? "blue" : "paper"}
                  veilColor={blue ? undefined : "#f3efe5"}
                  interactive={false}
                />
              </div>
            ) : first.layoutImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- plain img: it is deliberately wider than the panel, so only part of the plan shows
              <img src={first.layoutImage} alt={`Floor plan of unit ${first.unitNumber}`} draggable={false} style={blue ? BLUEPRINT_LIGHT_LINE_STYLE : undefined} className={cn("absolute inset-y-0 left-0 h-full w-[170%] max-w-none object-contain p-4 select-none", blue && "mix-blend-screen")} />
            ) : (
              <span className={cn("flex h-full items-center justify-center px-8 text-center text-sm", blue ? "text-[#cfe0f5]/80" : "text-[#6b6660]")}>
                Your floor plan will appear here once it is uploaded.
              </span>
            )}
            </div>
            {units.length > 1 && (
              <span aria-hidden className="absolute top-4 left-5 flex items-center gap-1.5">
                {units.map((u) => (
                  <span key={u.id} className={cn("h-1 rounded-full transition-all duration-300", u.id === first.id ? "w-5" : "w-1.5", blue ? (u.id === first.id ? "bg-white" : "bg-white/40") : u.id === first.id ? "bg-fg" : "bg-fg/25")} />
                ))}
              </span>
            )}
            <span className={cn("absolute bottom-4 left-4 flex items-center gap-2 rounded-full py-2 pr-3.5 pl-3 text-xs font-semibold text-white", blue ? "border border-white/25 bg-black/25 backdrop-blur-sm" : "bg-[#1f3d33]")}>
              <Maximize2 aria-hidden className="size-3.5" />
              View full plan
            </span>
          </button>
        </div>
      </section>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Your residences" className="lg:hidden" textured>
        <ul className="bg-surface-raised border-border divide-border divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
          {units.map((u, i) => {
            const active = u.id === first.id;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDir(i >= selectedIndex ? 1 : -1);
                    select(u.id);
                    setSheetOpen(false);
                  }}
                  aria-current={active}
                  className="active:bg-surface flex w-full items-center gap-4 px-5 py-4 text-left transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-serif-display text-fg block text-[1.75rem] leading-none">{u.unitNumber}</span>
                    <span className="text-fg-subtle mt-1.5 block truncate text-xs">
                      {u.projectName} · {u.bedrooms} bed · {u.sizeSqft.toLocaleString("en-US")} sqft
                    </span>
                  </span>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full transition-colors", active ? "bg-accent text-accent-foreground" : "border-border-strong border")}>
                    {active && <Check aria-hidden className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      {/* Full-screen viewer. The fixed layer never animates its own transform (Header.tsx documents why); only its opacity fades. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your home blueprint"
        aria-hidden={!open}
        data-no-swipe
        inert={!open || undefined}
        style={DOTS_TEXTURE}
        className={cn(
          "bg-surface fixed inset-0 z-[70] flex flex-col pt-[env(safe-area-inset-top)] pb-[calc(1rem+env(safe-area-inset-bottom))] transition-opacity duration-300 ease-[var(--ease-standard)] lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between px-[var(--gutter)] pt-4">
          <div>
            <p className="text-label text-fg-subtle uppercase">Blueprint</p>
            <p className="font-serif-display text-fg text-[1.75rem] leading-none">Unit {units[Math.min(page, units.length - 1)].unitNumber}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="bg-bg border-border text-fg flex size-11 items-center justify-center rounded-full border transition-transform active:scale-90"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div ref={pagerRef} onScroll={onScroll} className="no-scrollbar mt-4 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto">
          {units.map((unit) => (
            <div key={unit.id} className="flex w-full shrink-0 snap-center flex-col px-[var(--gutter)]">
              {/* Full screen: the whole plan, fitted to the screen. Pinch to zoom in on a room. */}
              {/* Full screen is always plain blue — the drafting grid is only for the small card on Home, where it would only add noise to a plan being studied up close. */}
              <ZoomPan label={`Floor plan of unit ${unit.unitNumber}`} className="my-1 min-h-0 min-w-0 flex-1 rounded-3xl">
              <div style={blue ? BLUEPRINT_LIGHT_STYLE : undefined} className={cn("relative isolate size-full overflow-hidden", !blue && PAPER)}>
                {unit.layoutImage && unit.highlight ? (
                  /* Full screen keeps a wider margin: 3.5 grid squares all round. */
                  <div className="absolute inset-0 flex items-center justify-center p-[42px] [container-type:size]">
                    <RoomStage
                      src={unit.layoutImage}
                      alt={`Floor plan of unit ${unit.unitNumber}`}
                      plan={{ aspect: unit.highlight.aspect, rooms: unit.highlight.rooms ?? [] }}
                      frame={unit.highlight.mine[0]?.points}
                      view={unit.highlight.view}
                      cardView={unit.highlight.homeView}
                      turn={homeTurn(unit.highlight)}
                      fit
                      selectedIds={roomSel[unit.id] ?? []}
                      onSelect={(ids) => setRoomSel((prev) => ({ ...prev, [unit.id]: ids }))}
                      tone={blue ? "blue" : "paper"}
                      veilColor={blue ? undefined : "#f3efe5"}
                    />
                  </div>
                ) : unit.layoutImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- plain img, fitted to the sheet
                  <img src={unit.layoutImage} alt={`Floor plan of unit ${unit.unitNumber}`} draggable={false} style={blue ? BLUEPRINT_LIGHT_LINE_STYLE : undefined} className={cn("absolute inset-0 size-full object-contain p-5 select-none", blue && "mix-blend-screen")} />
                ) : (
                  <p className={cn("flex h-full items-center justify-center px-8 text-center text-sm", blue ? "text-[#cfe0f5]/80" : "text-[#6b6660]")}>
                    Your floor plan has not been uploaded yet. Please contact us if you need a copy.
                  </p>
                )}
              </div>
              </ZoomPan>
              {unit.highlight?.rooms && unit.highlight.rooms.length > 0 && (
                <RoomPicker
                  plan={{ aspect: unit.highlight.aspect, rooms: unit.highlight.rooms }}
                  selectedIds={roomSel[unit.id] ?? []}
                  onSelect={(ids) => setRoomSel((prev) => ({ ...prev, [unit.id]: ids }))}
                  className="mt-2 shrink-0"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col items-center gap-4 px-[var(--gutter)]">
          {units.length > 1 && (
            <div aria-hidden className="flex items-center gap-1.5">
              {units.map((u, i) => (
                <span key={u.id} className={cn("h-1 rounded-full transition-all duration-200", i === page ? "bg-fg w-6" : "bg-border-strong w-1.5")} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-bg border-border text-fg h-12 w-full rounded-full border text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

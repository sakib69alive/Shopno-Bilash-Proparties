"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HomeBlueprintUnit {
  id: string;
  unitNumber: string;
  projectName: string;
  layoutImage?: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  facing?: string;
}

const FACING_LABEL = (f?: string) => (f ? f.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");

function Facts({ unit, className }: { unit: HomeBlueprintUnit; className?: string }) {
  const facts = [
    { label: "Beds", value: String(unit.bedrooms) },
    { label: "Baths", value: String(unit.bathrooms) },
    { label: "Size sqft", value: unit.sizeSqft.toLocaleString("en-US") },
    { label: "Facing", value: FACING_LABEL(unit.facing) },
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
export function HomeBlueprint({ units, firstName, className }: { units: HomeBlueprintUnit[]; firstName?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pagerRef = useRef<HTMLDivElement>(null);

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
  const first = units[0];

  function onScroll() {
    const el = pagerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setPage((c) => (c === next ? c : next));
  }

  return (
    <>
      <section className={cn("flex min-h-0 flex-col lg:hidden", className)}>
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Left column: who, which flat, and its numbers. The plan beside it rises all the way to the top of the screen. */}
          <div className="flex w-[7.25rem] shrink-0 flex-col justify-between gap-6">
            <div>
              {firstName && (
                <>
                  <p className="text-accent text-[0.625rem] font-semibold tracking-[0.22em] uppercase">Welcome back</p>
                  <p className="font-serif-display text-fg mt-1 text-[2rem] leading-none break-words">{firstName}</p>
                </>
              )}
              <p className={cn("text-accent text-[0.625rem] font-semibold tracking-[0.22em] uppercase", firstName && "mt-6")}>
                {units.length > 1 ? `Residence 1 of ${units.length}` : "Your residence"}
              </p>
              <p className="font-serif-display text-fg mt-1 text-[2rem] leading-none">{first.unitNumber}</p>
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
            onClick={() => setOpen(true)}
            aria-label={`Open the blueprint of unit ${first.unitNumber} full screen`}
            className={cn(
              "relative -mr-[var(--gutter)] min-h-[26rem] min-w-0 flex-1 overflow-hidden rounded-l-[2rem] transition-transform duration-150 active:scale-[0.99]",
              PAPER,
            )}
          >
            {first.layoutImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- plain img: it is deliberately wider than the panel, so only part of the plan shows
              <img src={first.layoutImage} alt={`Floor plan of unit ${first.unitNumber}`} draggable={false} className="absolute inset-y-0 left-0 h-full w-[170%] max-w-none object-contain p-4 select-none" />
            ) : (
              <span className="flex h-full items-center justify-center px-8 text-center text-sm text-[#6b6660]">
                Your floor plan will appear here once it is uploaded.
              </span>
            )}
            <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-[#1f3d33] py-2 pr-3.5 pl-3 text-xs font-semibold text-white">
              <Maximize2 aria-hidden className="size-3.5" />
              View full plan
            </span>
          </button>
        </div>
      </section>

      {/* Full-screen viewer. The fixed layer never animates its own transform (Header.tsx documents why); only its opacity fades. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your home blueprint"
        aria-hidden={!open}
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
            <div key={unit.id} className="flex w-full shrink-0 snap-center px-[var(--gutter)]">
              {/* Full screen: the whole plan, fitted to the screen. Pinch to zoom in on a room. */}
              <div className={cn("relative my-1 min-w-0 flex-1 overflow-hidden rounded-3xl", PAPER)}>
                {unit.layoutImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- plain img, fitted to the sheet
                  <img src={unit.layoutImage} alt={`Floor plan of unit ${unit.unitNumber}`} draggable={false} className="absolute inset-0 size-full touch-pinch-zoom object-contain p-5 select-none" />
                ) : (
                  <p className="flex h-full items-center justify-center px-8 text-center text-sm text-[#6b6660]">
                    Your floor plan has not been uploaded yet. Please contact us if you need a copy.
                  </p>
                )}
              </div>
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

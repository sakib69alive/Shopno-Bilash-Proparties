"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { RoomPicker, RoomStage } from "@/components/plan/RoomPlan";
import { buildingLevel } from "@/lib/planRooms";
import { Section } from "@/components/ui/Section";
import { BLUEPRINT_KIND_ORDER, type ProjectBlueprint } from "@/content/projects";
import { cn } from "@/lib/utils";

/**
 * The building's blueprints as one swipeable strip — garage, then floor,
 * then roof (whichever the admin uploaded). Tabs above jump to a slide and
 * follow the swipe; tapping a plan opens it full screen in the shared
 * Lightbox. Renders nothing when no blueprint has been uploaded.
 */
export function ProjectBlueprints({ blueprints: all, hidden = false, hideZoom = false }: { blueprints?: ProjectBlueprint[]; hidden?: boolean; hideZoom?: boolean }) {
  // Admin → Settings → Blueprint AI → Control panel can hide the whole section, one plan, or just the Enlarge button.
  const blueprints = hidden ? undefined : all?.filter((b) => !b.hidden);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // The room pressed on each plan (by slide), so swiping away and back keeps it.
  const [pickedRoom, setPickedRoom] = useState<Record<number, string[]>>({});

  const ordered = (blueprints ?? [])
    .slice()
    .sort((a, b) => BLUEPRINT_KIND_ORDER.indexOf(a.kind) - BLUEPRINT_KIND_ORDER.indexOf(b.kind));
  if (ordered.length === 0) return null;
  // The project page offers what a building floor has: flats, lift, stairs, lobby (rooms belong to each flat's own page).
  const activeRooms = buildingLevel(ordered[index]?.planRooms);
  // The two-column layout depends on whether ANY plan has rooms, not the visible one — otherwise the slider would change width
  // mid-swipe (the side panel appearing) and land on the wrong slide.
  const anyRooms = ordered.some((b) => buildingLevel(b.planRooms));

  function onScroll() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = scrollerRef.current;
      if (el && el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
    });
  }

  function goTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  }

  return (
    <Section spacing="sm">
      <Container>
        <Reveal className="mb-4">
          <p className="text-label text-fg-subtle uppercase">Plans</p>
          <h2 className="font-display mt-1 text-[1.375rem] leading-tight font-bold tracking-tight lg:text-h2">
            Building blueprints
          </h2>
        </Reveal>

        {ordered.length > 1 && (
          <div
            role="tablist"
            aria-label="Blueprints"
            className="bg-surface border-border mb-4 grid gap-1 rounded-full border p-1 lg:max-w-md"
            style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))` }}
          >
            {ordered.map((b, i) => (
              <button
                key={b.kind}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => goTo(i)}
                className={cn(
                  "h-10 min-w-0 truncate rounded-full px-2 text-sm font-semibold transition-colors duration-200",
                  i === index ? "bg-accent text-accent-foreground shadow-sm" : "text-fg-muted",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        <div className={cn(anyRooms && "lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10")}>
        <div className="min-w-0">
        {/* `isolate` + `contain: paint` keep the sideways-scrolling slider's layer from ever painting outside this card (over the fixed tab bar). */}
        <div className="border-border bg-surface-raised relative isolate overflow-hidden rounded-[var(--m-radius-hero)] border shadow-sm [contain:paint] lg:rounded-lg">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            role="group"
            aria-roledescription="carousel"
            aria-label="Building blueprints"
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          >
            {ordered.map((b, i) =>
              buildingLevel(b.planRooms) ? (
                // A plan with rooms: pressing a room lifts it; "Enlarge" below still opens the full-screen view.
                <div key={b.kind} className="relative w-full shrink-0 snap-center bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] p-3 [background-size:20px_20px] sm:p-5 lg:p-8">
                  <RoomStage
                    src={b.image.src}
                    alt={b.image.alt}
                    plan={buildingLevel(b.planRooms)!}
                    selectedIds={pickedRoom[i] ?? []}
                    onSelect={(ids) => setPickedRoom((p) => ({ ...p, [i]: ids }))}
                  />
                </div>
              ) : (
              <button
                key={b.kind}
                type="button"
                onClick={() => !hideZoom && setLightboxIndex(i)}
                aria-label={hideZoom ? `${b.label} blueprint` : `Open ${b.label} blueprint full screen`}
                className={cn(
                  "relative block aspect-[5/4] w-full shrink-0 snap-center bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:20px_20px] lg:aspect-[16/9]",
                  hideZoom && "cursor-default",
                )}
              >
                <Media
                  ratio="auto"
                  containerClassName="absolute inset-0 bg-transparent"
                  src={b.image.src}
                  alt={b.image.alt}
                  sizes="(min-width: 1280px) 1200px, 100vw"
                  className="object-contain p-4"
                />
              </button>
              ),
            )}
          </div>
          <div className="border-border flex h-12 items-center justify-between border-t px-4">
            <p className="text-body-sm truncate font-semibold">{ordered[index]?.label}</p>
            {!hideZoom && (
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="text-accent -mr-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold"
              >
                <Maximize2 aria-hidden className="size-4" />
                Enlarge
              </button>
            )}
          </div>
        </div>
        </div>
        {anyRooms && (
          <div>
        {activeRooms && (
          <RoomPicker
            plan={activeRooms}
            selectedIds={pickedRoom[index] ?? []}
            onSelect={(ids) => setPickedRoom((p) => ({ ...p, [index]: ids }))}
            className="mt-5 lg:sticky lg:top-28 lg:mt-0"
          />
        )}
          </div>
        )}
        </div>
      </Container>

      <Lightbox
        images={ordered.map((b) => ({ ...b.image, caption: b.label }))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        label="Building blueprints"
        surface="light"
      />
    </Section>
  );
}

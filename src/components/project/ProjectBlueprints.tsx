"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { BLUEPRINT_KIND_ORDER, type ProjectBlueprint } from "@/content/projects";
import { cn } from "@/lib/utils";

/**
 * The building's blueprints as one swipeable strip — garage, then floor,
 * then roof (whichever the admin uploaded). Tabs above jump to a slide and
 * follow the swipe; tapping a plan opens it full screen in the shared
 * Lightbox. Renders nothing when no blueprint has been uploaded.
 */
export function ProjectBlueprints({ blueprints }: { blueprints?: ProjectBlueprint[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const ordered = (blueprints ?? [])
    .slice()
    .sort((a, b) => BLUEPRINT_KIND_ORDER.indexOf(a.kind) - BLUEPRINT_KIND_ORDER.indexOf(b.kind));
  if (ordered.length === 0) return null;

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

        <div className="border-border bg-surface-raised overflow-hidden rounded-[var(--m-radius-hero)] border shadow-sm lg:rounded-lg">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            role="group"
            aria-roledescription="carousel"
            aria-label="Building blueprints"
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          >
            {ordered.map((b, i) => (
              <button
                key={b.kind}
                type="button"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Open ${b.label} blueprint full screen`}
                className="relative block aspect-[5/4] w-full shrink-0 snap-center bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:20px_20px] lg:aspect-[16/9]"
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
            ))}
          </div>
          <div className="border-border flex h-12 items-center justify-between border-t px-4">
            <p className="text-body-sm truncate font-semibold">{ordered[index]?.label}</p>
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="text-accent -mr-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold"
            >
              <Maximize2 aria-hidden className="size-4" />
              Enlarge
            </button>
          </div>
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

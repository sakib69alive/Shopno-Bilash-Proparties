"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { GALLERY_CATEGORIES, type GalleryItem } from "@/content/gallery";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/utils";
import { TabRail } from "./TabRail";
import { EmptyCard } from "./EmptyCard";

// A repeating run of tile shapes, so the two columns read as a masonry wall instead of a uniform grid.
const SHAPES = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[4/3]", "aspect-[4/5]", "aspect-[5/6]"];

/**
 * Phone Gallery: a serif opening, category chips (only categories that have
 * photos) and a two-column masonry of the photos. Tapping one opens the
 * full-screen viewer — swipe left/right to move between photos, with the
 * caption and a link to the related project underneath.
 */
export function GalleryM({ items, projects }: { items: GalleryItem[]; projects: Project[] }) {
  const [category, setCategory] = useState("All");
  const [index, setIndex] = useState<number | null>(null);

  const categories = useMemo(() => GALLERY_CATEGORIES.filter((c) => items.some((i) => i.category === c)), [items]);
  const filtered = useMemo(() => (category === "All" ? items : items.filter((i) => i.category === category)), [items, category]);

  const lightboxImages: LightboxImage[] = filtered.map((item) => {
    const project = item.projectSlug ? projects.find((p) => p.slug === item.projectSlug) : undefined;
    return {
      src: item.image.src,
      alt: item.image.alt,
      caption: item.caption ?? item.title,
      meta: project ? (
        <Link href={`/projects/${project.slug}`} className="text-button text-accent inline-flex items-center gap-2">
          {project.name} <ArrowRight aria-hidden className="size-4" />
        </Link>
      ) : undefined,
    };
  });

  // Two columns, filled so they stay balanced: tiles alternate left / right in order.
  const columns: { item: GalleryItem; i: number }[][] = [[], []];
  filtered.forEach((item, i) => columns[i % 2].push({ item, i }));

  return (
    <div className="flex flex-col gap-6 pt-6 pb-8 lg:hidden">
      <section className="px-[var(--gutter)]">
        <p className="hero-in text-label text-fg-subtle uppercase" style={{ animationDelay: "0ms" }}>
          Gallery
        </p>
        <h1 className="font-serif-display hero-in mt-3 text-[2.75rem] leading-[1.02] text-balance" style={{ animationDelay: "100ms" }}>
          A visual record of our work.
        </h1>
        <span aria-hidden className="bg-premium hero-in mt-6 block h-px w-12" />
        {items.length > 0 && (
          <p className="hero-in text-fg-muted mt-5 text-[0.9375rem]" style={{ animationDelay: "220ms" }}>
            {items.length} {items.length === 1 ? "photo" : "photos"} — architecture, construction and completed work.
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <div className="px-[var(--gutter)]">
          <EmptyCard
            icon={Images}
            title="More photography is coming"
            description="We're building out our visual archive as each project progresses."
          />
        </div>
      ) : (
        <>
          {categories.length > 1 && (
            <TabRail
              label="Gallery category"
              value={category}
              onValueChange={(c) => {
                setCategory(c);
                setIndex(null);
              }}
              tabs={[{ value: "All", label: "All", count: items.length }, ...categories.map((c) => ({ value: c, label: c, count: items.filter((i) => i.category === c).length }))]}
            />
          )}

          <div className="grid grid-cols-2 items-start gap-2.5 px-[var(--gutter)]">
            {columns.map((col, c) => (
              <div key={c} className="flex flex-col gap-2.5">
                {col.map(({ item, i }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={item.title ? `Open photo: ${item.title}` : `Open photo ${i + 1}`}
                    className="group relative block w-full text-left transition-transform active:scale-[0.97]"
                  >
                    <Media
                      ratio="auto"
                      src={item.image.src}
                      alt=""
                      sizes="(min-width: 768px) 45vw, 48vw"
                      containerClassName={cn("rounded-[var(--m-radius-card)]", SHAPES[(i + c * 2) % SHAPES.length])}
                      overlay={Boolean(item.title)}
                      caption={undefined}
                    />
                    {item.title && (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 p-3 text-xs leading-snug font-semibold text-white">
                        {item.title}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <Lightbox images={lightboxImages} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} label="Gallery" />
    </div>
  );
}

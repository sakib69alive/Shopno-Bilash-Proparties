"use client";

import { useRef, useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { Media } from "@/components/ui/Media";
import type { ImageAsset } from "@/content/shared";
import { cn } from "@/lib/utils";

export interface PhotoPagerProps {
  images: ImageAsset[];
  /** Aspect-ratio class for each slide, e.g. `aspect-[4/3]`. */
  aspectClassName?: string;
  /** Round the pager's corners, e.g. `rounded-[var(--m-radius-hero)]`. */
  className?: string;
  sizes?: string;
  /** Preload the first slide. Only set this when the pager is in the visible (phone) layout — a `priority` image inside `lg:hidden` still preloads on desktop. */
  priorityFirst?: boolean;
  /** Overlaid above the photos (back / share / save buttons). */
  children?: ReactNode;
}

/** Swipeable photo strip with a "1/12" counter. Tap-through and zoom are the page's job. */
export function PhotoPager({
  images,
  aspectClassName = "aspect-[4/3]",
  className,
  sizes = "100vw",
  priorityFirst = false,
  children,
}: PhotoPagerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);

  function onScroll() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      setIndex(Math.round(el.scrollLeft / el.clientWidth));
    });
  }

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "bg-surface text-fg-subtle relative flex items-center justify-center overflow-hidden",
          aspectClassName,
          className,
        )}
      >
        <ImageOff aria-hidden className="size-7" />
        <span className="sr-only">No photos yet</span>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="group"
        aria-roledescription="carousel"
        aria-label="Photos"
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {images.map((image, i) => (
          <div
            key={`${image.src}-${i}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${images.length}`}
            className={cn("relative w-full shrink-0 snap-center", aspectClassName)}
          >
            <Media
              ratio="auto"
              src={image.src}
              alt={image.alt}
              sizes={sizes}
              priority={priorityFirst && i === 0}
              containerClassName="absolute inset-0"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <span
          aria-hidden
          className="bg-overlay absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white tabular-nums"
        >
          {index + 1}/{images.length}
        </span>
      )}
      {children}
    </div>
  );
}

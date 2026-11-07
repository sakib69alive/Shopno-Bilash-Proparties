"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZoomPan } from "@/components/plan/ZoomPan";
import type { ImageAsset } from "@/content/shared";

export interface LightboxImage extends ImageAsset {
  /** Optional caption/title shown under the image — e.g. gallery item titles. */
  caption?: string;
  /** Optional extra content under the caption — e.g. a "View Project" link. */
  meta?: ReactNode;
}

export interface LightboxProps {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  label?: string;
  /** "light" seats the image on an ivory panel — for drawings (floor plans, blueprints) whose dark lines vanish on the black backdrop. */
  surface?: "dark" | "light";
}

/**
 * Full-screen image viewer — arrow-key and Escape navigable, `inert` while
 * closed (same pattern as <MobileNav>/<ProjectFilters>'s sheet), focus
 * moves to the close button on open. Used by <Gallery> and directly by
 * single-image viewers (e.g. a floor plan) that don't want the grid, and
 * by the Gallery page for its richer per-image caption/project link.
 */
export function Lightbox({ images, index, onClose, onNavigate, label = "Image viewer", surface = "dark" }: LightboxProps) {
  const open = index !== null;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate(((index as number) + 1) % images.length);
      if (e.key === "ArrowLeft") onNavigate(((index as number) - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, index, images.length, onClose, onNavigate]);

  const current = open ? images[index] : null;

  // Swipe to move between photos on a touch screen: a mostly-horizontal drag of 50px or more.
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || images.length < 2 || index === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    onNavigate(dx < 0 ? (index + 1) % images.length : (index - 1 + images.length) % images.length);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={!open}
      data-no-swipe
      inert={!open || undefined}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4 transition-opacity duration-300 ease-[var(--ease-standard)]",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute top-6 right-6 flex size-11 items-center justify-center text-white/80 hover:text-white"
      >
        <X aria-hidden className="size-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => onNavigate(((index as number) - 1 + images.length) % images.length)}
            aria-label="Previous image"
            className="absolute left-2 flex size-12 items-center justify-center text-white/70 hover:text-white sm:left-6"
          >
            <ChevronLeft aria-hidden className="size-7" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate(((index as number) + 1) % images.length)}
            aria-label="Next image"
            className="absolute right-2 flex size-12 items-center justify-center text-white/70 hover:text-white sm:right-6"
          >
            <ChevronRight aria-hidden className="size-7" />
          </button>
        </>
      )}

      {current && (
        // Pinch to zoom the picture itself (not the page); a fresh zoom for every picture.
        <ZoomPan key={index} label={current.alt} className={cn("h-[75svh] w-[90vw]", surface === "light" && "bg-bg h-[72svh] w-[92vw] rounded-lg")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.src} alt={current.alt} draggable={false} className={cn("size-full object-contain select-none", surface === "light" && "p-3 sm:p-5")} />
        </ZoomPan>
      )}

      {current && (current.caption || current.meta) && (
        <div className="mt-5 max-w-md text-center">
          {current.caption && <p className="text-body text-white">{current.caption}</p>}
          {current.meta && <div className="mt-2">{current.meta}</div>}
        </div>
      )}

      {open && images.length > 1 && (
        <p className="text-caption mt-4 text-white/60 tabular-nums">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

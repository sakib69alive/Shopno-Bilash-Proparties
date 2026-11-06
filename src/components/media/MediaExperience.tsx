"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ExternalLink, Play, Rotate3d, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { parseTourUrl, parseVideoUrl, type TourSource, type VideoSource } from "@/lib/mediaLinks";
import { cn } from "@/lib/utils";

type Mode = "video" | "tour";

export interface MediaExperienceProps {
  videoUrl?: string;
  tour360Url?: string;
  /** Name of the project/unit — read out by screen readers and shown in the viewer's top bar. */
  title: string;
  /**
   * "page" wraps itself in the site's normal section spacing (desktop pages and the project page);
   * "inline" is just the heading and cards with phone side padding, for dropping between existing phone sections.
   */
  variant?: "page" | "inline";
}

/**
 * "See it for yourself" — a Video card and/or a 360° card for a project or unit.
 * Each card only exists when the admin pasted a working link for it; with neither
 * link the whole block renders nothing (not even its heading or spacing).
 * Tapping a card opens a full-screen viewer that loads the video/tour only then,
 * so a page with a heavy 360° tour costs nothing until someone asks for it.
 */
export function MediaExperience({ videoUrl, tour360Url, title, variant = "page" }: MediaExperienceProps) {
  const video = parseVideoUrl(videoUrl);
  const tour = parseTourUrl(tour360Url);
  const [mode, setMode] = useState<Mode | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((next: Mode, el: HTMLElement) => {
    openerRef.current = el;
    setMode(next);
  }, []);
  const close = useCallback(() => {
    setMode(null);
    openerRef.current?.focus?.();
  }, []);

  if (!video && !tour) return null;

  const cards = (
    <>
      <div className="mb-4">
        <p className="text-label text-fg-subtle uppercase">Experience it</p>
        <h2 className="font-display mt-1 text-[1.375rem] leading-tight font-bold tracking-tight lg:text-h2">See it for yourself</h2>
      </div>

      <div className={cn("grid gap-3", video && tour ? "sm:grid-cols-2" : "max-w-xl")}>
        {video && (
          <button
            type="button"
            onClick={(e) => open("video", e.currentTarget)}
            className="bg-accent text-accent-foreground group relative flex min-h-[7.5rem] touch-manipulation items-center gap-4 overflow-hidden rounded-[var(--m-radius-card)] p-5 text-left transition-transform duration-150 active:scale-[0.98]"
          >
            <span aria-hidden className="bg-accent-foreground/10 absolute -top-10 -right-10 size-40 rounded-full" />
            <span className="bg-accent-foreground text-accent relative flex size-14 shrink-0 items-center justify-center rounded-full motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-105">
              <Play aria-hidden className="ml-0.5 size-6 fill-current" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="font-display block text-lg leading-tight font-semibold">Watch the video</span>
              <span className="text-accent-foreground/75 mt-1 block text-sm">A walk through {title}</span>
            </span>
            <ArrowUpRight aria-hidden className="text-accent-foreground/70 relative size-5 shrink-0" />
          </button>
        )}

        {tour && (
          <button
            type="button"
            onClick={(e) => open("tour", e.currentTarget)}
            className="bg-surface-raised border-border text-fg group relative flex min-h-[7.5rem] touch-manipulation items-center gap-4 overflow-hidden rounded-[var(--m-radius-card)] border p-5 text-left transition-transform duration-150 active:scale-[0.98]"
          >
            <span aria-hidden className="bg-accent-soft absolute -top-10 -right-10 size-40 rounded-full" />
            <span className="bg-accent text-accent-foreground relative flex size-14 shrink-0 items-center justify-center rounded-full">
              <Rotate3d aria-hidden className="size-6 motion-safe:animate-[spin_14s_linear_infinite]" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="font-display block text-lg leading-tight font-semibold">Look around in 360°</span>
              <span className="text-fg-muted mt-1 block text-sm">Drag to explore every corner</span>
            </span>
            <ArrowUpRight aria-hidden className="text-fg-subtle relative size-5 shrink-0" />
          </button>
        )}
      </div>

      {mode && <MediaViewer mode={mode} video={video} tour={tour} title={title} onModeChange={setMode} onClose={close} />}
    </>
  );

  if (variant === "inline") return <section aria-label="Video and 360° tour" className="px-[var(--gutter)]">{cards}</section>;

  return (
    <Section spacing="sm" aria-label="Video and 360° tour">
      <Container>
        <Reveal>{cards}</Reveal>
      </Container>
    </Section>
  );
}

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

function MediaViewer({
  mode,
  video,
  tour,
  title,
  onModeChange,
  onClose,
}: {
  mode: Mode;
  video: VideoSource | null;
  tour: TourSource | null;
  title: string;
  onModeChange: (m: Mode) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const openUrl = mode === "video" ? video?.watchUrl : tour?.openUrl;
  const label = mode === "video" ? "Video" : "360° tour";

  function switchTo(next: Mode) {
    setLoaded(false);
    onModeChange(next);
  }

  // Portalled to <body>: the cards sit inside an animated (transformed) wrapper, and a `fixed` element
  // inside a transformed parent is sized to that parent instead of the screen.
  return createPortal(
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`${label} — ${title}`} className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
      <div className="flex shrink-0 items-center gap-3 px-[var(--gutter)] pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>

        {video && tour && (
          <div role="tablist" aria-label="View" className="flex shrink-0 gap-1 rounded-full bg-white/10 p-1">
            {(["video", "tour"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => mode !== m && switchTo(m)}
                className={cn(
                  "h-8 touch-manipulation rounded-full px-3.5 text-xs font-semibold transition-colors",
                  mode === m ? "bg-white text-black" : "text-white/75",
                )}
              >
                {m === "video" ? "Video" : "360°"}
              </button>
            ))}
          </div>
        )}

        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the ${label} in a new tab`}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <ExternalLink aria-hidden className="size-[18px]" />
          </a>
        )}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center pb-[env(safe-area-inset-bottom)]">
        {!loaded && <p className="absolute text-sm text-white/60">Loading…</p>}

        {mode === "video" && video?.kind === "file" && (
          <video
            key={video.embedUrl}
            src={video.embedUrl}
            controls
            autoPlay
            playsInline
            onLoadedData={() => setLoaded(true)}
            className="max-h-full w-full max-w-5xl bg-black"
          />
        )}

        {mode === "video" && video && video.kind !== "file" && (
          <div className="aspect-video w-full max-w-5xl">
            <iframe
              key={video.embedUrl}
              src={video.embedUrl}
              title={`Video — ${title}`}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setLoaded(true)}
              className="size-full border-0"
            />
          </div>
        )}

        {mode === "tour" && tour && (
          <iframe
            key={tour.embedUrl}
            src={tour.embedUrl}
            title={`360° tour — ${title}`}
            allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer; autoplay"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoaded(true)}
            className="size-full border-0"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

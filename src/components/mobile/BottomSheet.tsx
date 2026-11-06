"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title: string;
  children: ReactNode;
  /** Extra classes on the outer layer (e.g. `lg:hidden` for a phone-only sheet). */
  className?: string;
  /** Paints the sheet with the site's blueprint dot-grid on the stone surface colour (the same texture as About's story section). */
  textured?: boolean;
}

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
// Pull the sheet down this far (px) and let go to dismiss it.
const DISMISS_DISTANCE = 90;

/**
 * Phone-style sheet that slides up from the bottom edge: scrim, grab handle,
 * swipe-down-to-dismiss on the header, Escape / scrim tap to close, focus
 * kept inside while open. The `fixed` layer never animates its own
 * transform (Header.tsx documents the compositor bug that causes) — only
 * the inner, absolutely-positioned panel slides.
 */
export function BottomSheet({ open, onClose, title, children, className, textured = false }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    // Freeze the page behind the sheet. `overflow: hidden` alone is ignored by
    // iOS Safari and some Android browsers (the page scrolls under the sheet),
    // so the body is pinned with position: fixed and the scroll spot restored on close.
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

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
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current));
  }
  function onTouchEnd() {
    if (dragY > DISMISS_DISTANCE) onClose();
    dragStartY.current = null;
    setDragY(0);
  }

  const dragging = dragY > 0;

  return (
    <div
      aria-hidden={!open}
      inert={!open || undefined}
      className={cn("fixed inset-0 z-[60]", !open && "pointer-events-none", className)}
    >
      <div
        onClick={onClose}
        className={cn(
          "bg-overlay absolute inset-0 transition-opacity duration-300 ease-[var(--ease-standard)]",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          ...(dragging ? { transform: `translateY(${dragY}px)` } : null),
          ...(textured
            ? {
                backgroundImage:
                  "radial-gradient(circle, var(--color-border-strong) 1px, transparent 1px), radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 70%)",
                backgroundSize: "28px 28px, 100% 100%",
              }
            : null),
        }}
        className={cn(
          textured ? "bg-surface" : "bg-bg",
          "absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[var(--m-radius-hero)]",
          !dragging && "transition-transform duration-300 ease-[var(--ease-standard)]",
          !dragging && (open ? "translate-y-0" : "translate-y-full"),
        )}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="touch-none shrink-0 px-[var(--gutter)] pt-2.5"
        >
          <div aria-hidden className="bg-border-strong mx-auto h-1 w-10 rounded-full" />
          <div className="flex min-h-12 items-center justify-between">
            <h2 id={titleId} className="text-h4">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-fg-muted hover:bg-surface -mr-2 flex size-11 items-center justify-center rounded-full transition-colors"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        </div>
        <div className="no-scrollbar overflow-y-auto overscroll-contain px-[var(--gutter)] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

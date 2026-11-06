"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  id?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Centered dialog — same backdrop/Escape/focus-trap/scroll-lock contract
 * as `Drawer`, for a confirmation or a short create/edit form rather than
 * a full off-canvas panel. Brief §18: prefer a dedicated page over this
 * for a genuinely large form.
 */
export function Modal({ open, onClose, children, title, description, size = "md", id }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

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
      const restore = previouslyFocused.current;
      if (restore instanceof HTMLElement) restore.focus();
    };
  }, [open, onClose]);

  return (
    <div aria-hidden={!open} inert={!open || undefined} className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-fg/40 transition-opacity duration-200 ease-[var(--ease-standard)]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          // Phone: slides up as a bottom sheet with rounded top corners; from `sm` up it is the centered dialog it always was.
          "bg-bg relative flex w-full max-h-[90svh] flex-col rounded-t-[var(--m-radius-hero)] shadow-float transition-[transform,opacity] duration-200 ease-[var(--ease-standard)] sm:max-h-[85vh] sm:rounded-lg",
          SIZE_CLASSES[size],
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        {(title || description) && (
          <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6 sm:py-5">
            <div>
              {title && <p className="text-h4">{title}</p>}
              {description && <p className="text-body-sm text-fg-muted mt-1">{description}</p>}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="shrink-0" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">{children}</div>
      </div>
    </div>
  );
}

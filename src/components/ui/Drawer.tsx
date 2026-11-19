"use client";

import { useUiLanguage } from "./UiLanguage";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  side?: "left" | "right";
  /** Content width below the `sm` breakpoint is always full-bleed; this sets the width from `sm` up. */
  widthClassName?: string;
  id?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Generic off-canvas panel — backdrop, Escape-to-close, focus trapped
 * inside while open, body scroll locked, focus restored to whatever
 * triggered it on close. Same interaction contract as the public site's
 * `MobileNav`/filter sheets, generalized so Admin's mobile sidebar (and
 * any future detail/edit drawer) doesn't reimplement it.
 */
export function Drawer({ open, onClose, children, title, side = "left", widthClassName = "sm:w-80", id }: DrawerProps) {
  const { t } = useUiLanguage();
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
    <div aria-hidden={!open} inert={!open || undefined} className="fixed inset-0 z-[70]">
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
        aria-label={title ? t(title) : undefined}
        className={cn(
          "bg-bg absolute inset-y-0 flex w-[85%] max-w-sm flex-col shadow-float transition-transform duration-250 ease-[var(--ease-standard)]",
          widthClassName,
          side === "left" ? "left-0" : "right-0",
          open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
        )}
      >
        {title && (
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <p className="text-h4">{t(title)}</p>
            <IconButton icon={X} label="Close" onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

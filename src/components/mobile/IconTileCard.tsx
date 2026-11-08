"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";

/**
 * The interactive half of `IconTile`: a card that shows a short preview and, on
 * tap, a sheet with the full text. Takes the icon as ready-made elements (not a
 * component), so a Server Component can render `IconTile` too.
 */
export function IconTileCard({
  icon,
  iconLarge,
  title,
  description,
  links,
  className,
}: {
  icon: ReactNode;
  iconLarge: ReactNode;
  title: string;
  description: string;
  /** Pages that belong to this item; shown as buttons in the sheet, the first one highlighted. */
  links?: { label: string; href: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${title} — read more`}
        className={cn(
          "bg-surface-raised border-border flex touch-manipulation flex-col gap-3 rounded-[var(--m-radius-card)] border p-4 text-left transition-transform duration-150 [-webkit-tap-highlight-color:transparent] active:scale-[0.97]",
          className,
        )}
      >
        <div className="flex items-start justify-between">
          <span className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-full">{icon}</span>
          <span aria-hidden className="text-fg-subtle border-border flex size-7 items-center justify-center rounded-full border">
            <Plus className="size-3.5" />
          </span>
        </div>
        <div>
          <p className="text-h4 leading-snug">{title}</p>
          <p className="text-body-sm text-fg-muted mt-1.5 line-clamp-3">{description}</p>
        </div>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} textured className="lg:hidden">
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex items-start gap-4">
            <span className="bg-accent-soft text-accent flex size-14 shrink-0 items-center justify-center rounded-2xl">{iconLarge}</span>
            <p className="text-body text-fg-muted pt-0.5 leading-relaxed whitespace-pre-line">{description}</p>
          </div>

          {links && links.length > 0 && (
            <nav aria-label={`${title} — where to go`} className="flex flex-col gap-2.5">
              <p className="text-label text-fg-subtle uppercase">Go to</p>
              {links.map((link, i) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-[3.25rem] touch-manipulation items-center justify-between gap-3 rounded-2xl px-4 text-left font-medium transition-transform duration-150 [-webkit-tap-highlight-color:transparent] active:scale-[0.98]",
                    i === 0 ? "bg-accent text-accent-foreground" : "bg-surface-raised border-border text-fg border",
                  )}
                >
                  <span className="text-body-sm">{link.label}</span>
                  <ArrowRight aria-hidden className="size-4 shrink-0" />
                </Link>
              ))}
            </nav>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

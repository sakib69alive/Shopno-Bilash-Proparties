"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
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
  className,
}: {
  icon: ReactNode;
  iconLarge: ReactNode;
  title: string;
  description: string;
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

      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} className="lg:hidden">
        <div className="flex flex-col gap-4 pb-2">
          <span className="bg-accent-soft text-accent flex size-14 items-center justify-center rounded-full">{iconLarge}</span>
          <p className="text-body text-fg-muted leading-relaxed whitespace-pre-line">{description}</p>
        </div>
      </BottomSheet>
    </>
  );
}

"use client";

import { Heart } from "lucide-react";
import { useIsSaved } from "@/hooks/useSavedProperties";
import { toggleSaved } from "@/lib/savedProperties";
import { cn } from "@/lib/utils";

export interface SaveButtonProps {
  id: string;
  name: string;
  /** "icon" — round overlay for a card image. "inline" — labeled button for a hero/detail action row. */
  variant?: "icon" | "inline";
  className?: string;
}

export function SaveButton({ id, name, variant = "icon", className }: SaveButtonProps) {
  const saved = useIsSaved(id);

  function handleClick(event: React.MouseEvent) {
    // Stops the click from being treated as a card-navigation press when this
    // sits visually over a <PropertyCard> — kept even though PropertyCard
    // now renders this as a sibling of the Link (not nested inside it), as
    // a defensive guard against a future layout change reintroducing that nesting.
    event.preventDefault();
    event.stopPropagation();
    toggleSaved(id);
  }

  const label = saved ? `Remove ${name} from saved properties` : `Save ${name}`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          "border-border-strong text-fg inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm transition-colors hover:bg-surface",
          className,
        )}
      >
        <Heart aria-hidden className={cn("size-4", saved && "fill-accent text-accent")} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        "bg-bg/90 text-fg flex size-9 items-center justify-center rounded-full transition-colors hover:bg-bg",
        className,
      )}
    >
      <Heart aria-hidden className={cn("size-4.5", saved && "fill-accent text-accent")} />
    </button>
  );
}

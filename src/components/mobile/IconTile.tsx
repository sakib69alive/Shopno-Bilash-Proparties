import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTileCard } from "./IconTileCard";

export interface IconTileProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

/**
 * Small icon + label card for 2-up grids (e.g. "What we do"). The card shows a
 * short preview; tapping it opens a sheet with the full text, since the grid
 * leaves room for only a few lines. Without a description it is a plain card.
 */
export function IconTile({ icon: Icon, title, description, className }: IconTileProps) {
  if (!description) {
    return (
      <div className={cn("bg-surface-raised border-border flex flex-col gap-3 rounded-[var(--m-radius-card)] border p-4", className)}>
        <span className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-full">
          <Icon aria-hidden className="size-5" />
        </span>
        <p className="text-h4 leading-snug">{title}</p>
      </div>
    );
  }

  return (
    <IconTileCard
      icon={<Icon aria-hidden className="size-5" />}
      iconLarge={<Icon aria-hidden className="size-6" />}
      title={title}
      description={description}
      className={className}
    />
  );
}

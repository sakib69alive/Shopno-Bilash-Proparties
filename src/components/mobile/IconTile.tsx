import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IconTileProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

/** Small icon + label card for 2-up grids (e.g. "What we do"). */
export function IconTile({ icon: Icon, title, description, className }: IconTileProps) {
  return (
    <div
      className={cn(
        "bg-surface-raised border-border flex flex-col gap-3 rounded-[var(--m-radius-card)] border p-4",
        className,
      )}
    >
      <span className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-full">
        <Icon aria-hidden className="size-5" />
      </span>
      <div>
        <p className="text-h4 leading-snug">{title}</p>
        {description && <p className="text-body-sm text-fg-muted mt-1.5 line-clamp-3">{description}</p>}
      </div>
    </div>
  );
}

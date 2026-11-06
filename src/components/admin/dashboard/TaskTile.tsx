import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface TaskTileProps {
  title: string;
  /** One plain sentence on when to use it — written the way the admin would say it, not as a module name. */
  help: string;
  icon: LucideIcon;
  href: string;
}

/** A big, tappable "I want to…" card for the jobs done most often (see the dashboard's first section). */
export function TaskTile({ title, help, icon: Icon, href }: TaskTileProps) {
  return (
    <Link
      href={href}
      className="border-border bg-surface-raised hover:border-accent group flex items-start gap-3.5 rounded-xl border p-4 shadow-sm transition-colors"
    >
      <span className="bg-accent-soft text-accent flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="text-body text-fg block font-semibold">{title}</span>
        <span className="text-body-sm text-fg-muted mt-0.5 block">{help}</span>
      </span>
    </Link>
  );
}

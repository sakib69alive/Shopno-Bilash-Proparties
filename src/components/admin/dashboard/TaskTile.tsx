import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
      className="border-border bg-surface-raised group relative flex items-start gap-4 rounded-2xl border p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_12px_28px_rgb(0_0_0/0.08)]"
    >
      <span className="from-accent to-accent-strong text-accent-foreground flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 pr-5">
        <span className="text-body text-fg block font-semibold tracking-tight">{title}</span>
        <span className="text-body-sm text-fg-muted mt-1 block leading-snug">{help}</span>
      </span>
      <ArrowUpRight aria-hidden className="text-fg-subtle group-hover:text-accent absolute top-4 right-4 size-4 transition-colors" />
    </Link>
  );
}

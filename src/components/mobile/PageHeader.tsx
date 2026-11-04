import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned slot, e.g. a count or a filter button. */
  action?: ReactNode;
  className?: string;
}

/** Compact page title for list pages on a phone — the page's `h1`. */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-[var(--gutter)] pt-5 pb-4", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[1.5rem] leading-tight font-bold tracking-tight">{title}</h1>
        {description && <p className="text-body-sm text-fg-muted mt-1.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

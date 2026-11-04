import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  title: string;
  description?: string;
  /** Adds a "View all" style link on the right. */
  href?: string;
  actionLabel?: string;
  className?: string;
}

/** Section title for the phone layout (20px) with an optional "View all" link. */
export function SectionHeading({ title, description, href, actionLabel = "View all", className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 px-[var(--gutter)]", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[1.25rem] leading-tight font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-body-sm text-fg-muted mt-1">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="text-accent -mr-2 inline-flex h-11 shrink-0 items-center gap-0.5 px-2 text-sm font-semibold"
        >
          {actionLabel}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}

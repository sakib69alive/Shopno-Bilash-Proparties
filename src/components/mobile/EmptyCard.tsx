import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  className?: string;
}

/** A calm "nothing here yet" card — the phone layout's answer to a section with no data. */
export function EmptyCard({ title, description, icon: Icon = Inbox, action, className }: EmptyCardProps) {
  return (
    <div
      className={cn(
        "bg-surface border-border flex flex-col items-center gap-2 rounded-[var(--m-radius-card)] border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <span className="bg-accent-soft text-accent flex size-12 items-center justify-center rounded-full">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-h4 mt-1">{title}</p>
      {description && <p className="text-body-sm text-fg-muted max-w-xs">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="bg-accent text-accent-foreground text-button mt-3 inline-flex h-11 items-center rounded-full px-5 transition-transform active:scale-[0.97]"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

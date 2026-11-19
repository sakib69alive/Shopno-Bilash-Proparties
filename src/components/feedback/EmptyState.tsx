import { UiText } from "@/components/ui/UiLanguage";
import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  /** A lower-emphasis alternative alongside `action`, e.g. "Learn more" next to "Add Unit". */
  secondaryAction?: ReactNode;
  className?: string;
}

/** e.g. "No projects found." — the default state for a list with zero rows. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "empty-state-in flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 px-6 text-center",
        className,
      )}
    >
      <Icon className="size-8 text-fg-subtle" aria-hidden />
      <p className="text-h4"><UiText>{title}</UiText></p>
      {description && (
        <p className="text-body-sm text-fg-muted max-w-sm"><UiText>{description}</UiText></p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-1 flex items-center gap-2.5">
          {secondaryAction}
          {action}
        </div>
      )}
    </div>
  );
}

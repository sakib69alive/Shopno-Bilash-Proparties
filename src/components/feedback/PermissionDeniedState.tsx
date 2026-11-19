import { UiText } from "@/components/ui/UiLanguage";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PermissionDeniedStateProps {
  description?: string;
  className?: string;
}

/** Shown instead of a 403 blank page whenever a permission check fails. */
export function PermissionDeniedState({
  description = "You don't have permission to view this information.",
  className,
}: PermissionDeniedStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface py-16 px-6 text-center",
        className,
      )}
    >
      <Lock className="size-8 text-fg-subtle" aria-hidden />
      <p className="text-h4"><UiText>{"Access restricted"}</UiText></p>
      <p className="text-body-sm text-fg-muted max-w-sm"><UiText>{description}</UiText></p>
    </div>
  );
}

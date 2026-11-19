import { UiText } from "@/components/ui/UiLanguage";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Generic "something went wrong" state — never leave a blank screen on failure. */
export function ErrorState({
  title = "Something went wrong",
  description = "Please try again, or contact support if the problem continues.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-error-soft bg-error-soft/40 py-16 px-6 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-error" aria-hidden />
      <p className="text-h4"><UiText>{title}</UiText></p>
      <p className="text-body-sm text-fg-muted max-w-sm"><UiText>{description}</UiText></p>
      {action}
    </div>
  );
}

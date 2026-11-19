import { UiText } from "@/components/ui/UiLanguage";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className,
      )}
      role="status"
    >
      <Loader2 className="size-6 animate-spin text-fg-subtle" aria-hidden />
      <p className="text-body-sm text-fg-muted"><UiText>{label}</UiText></p>
    </div>
  );
}

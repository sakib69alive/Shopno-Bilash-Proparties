import { UiText } from "@/components/ui/UiLanguage";
import { STATUS_CONFIG, STATUS_TONE_CLASSES, type StatusKey } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status: StatusKey;
  className?: string;
}

/**
 * Status is always communicated with an icon + text label, never color
 * alone, so the badge remains meaningful without relying on color vision.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        STATUS_TONE_CLASSES[config.tone],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <UiText>{config.label}</UiText>
    </span>
  );
}

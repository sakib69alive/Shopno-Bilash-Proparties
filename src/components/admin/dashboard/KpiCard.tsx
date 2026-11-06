import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUS_TONE_CLASSES, type StatusTone } from "@/lib/status";

export interface KpiTrend {
  direction: "up" | "down" | "flat";
  label: string;
}

export interface KpiCardProps {
  label: string;
  /** `null` = module not tracked yet; a number (including 0) = a real current count. */
  value: number | null;
  formatValue?: (value: number) => string;
  description?: string;
  /** Shown instead of `description` specifically when `value` is `null`. */
  emptyLabel?: string;
  status?: StatusTone;
  trend?: KpiTrend;
  loading?: boolean;
  className?: string;
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

/**
 * The one KPI shape every current and future dashboard metric renders
 * through (Admin Step 4 brief §6). Never hardcodes a number itself —
 * every value comes from `features/dashboard/data.ts`.
 */
export function KpiCard({
  label,
  value,
  formatValue = (v) => formatNumber(v),
  description,
  emptyLabel = "Not tracked yet",
  status,
  trend,
  loading,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn("border-border bg-surface-raised rounded-lg border p-4", className)}>
        <div className="bg-surface h-3.5 w-24 animate-pulse rounded" />
        <div className="bg-surface mt-4 h-8 w-16 animate-pulse rounded" />
        <div className="bg-surface mt-3 h-3 w-32 animate-pulse rounded" />
      </div>
    );
  }

  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  return (
    <div className={cn("border-border bg-surface-raised hover:border-border-strong rounded-lg border p-3.5 transition-colors sm:p-4", className)}>
      <div className="flex items-center gap-2">
        <p className="text-label text-fg-subtle truncate uppercase">{label}</p>
        {status && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", STATUS_TONE_CLASSES[status])} />}
      </div>

      <p className={cn("text-stat-admin mt-2 truncate", value === null && "text-fg-subtle")} title={value === null ? undefined : formatValue(value)}>
        {value === null ? "—" : formatValue(value)}
      </p>

      {value === null ? (
        <p className="text-caption text-fg-subtle mt-2">{emptyLabel}</p>
      ) : (
        (description || trend) && (
          <div className="mt-2 flex items-center gap-1.5">
            {trend && TrendIcon && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-caption",
                  trend.direction === "up" && "text-success",
                  trend.direction === "down" && "text-error",
                  trend.direction === "flat" && "text-fg-subtle",
                )}
              >
                <TrendIcon aria-hidden className="size-3" />
                {trend.label}
              </span>
            )}
            {description && <p className="text-caption text-fg-subtle">{description}</p>}
          </div>
        )
      )}
    </div>
  );
}

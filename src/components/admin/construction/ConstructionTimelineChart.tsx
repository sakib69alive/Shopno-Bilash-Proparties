import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/admin/construction/ProgressBar";
import { formatDate } from "@/lib/format";
import { deriveScheduleDelay } from "@/lib/constructionProgress";
import type { ConstructionPhase } from "@/types/construction";

export interface ConstructionTimelineChartProps {
  phases: ConstructionPhase[];
  effectiveProgressOf: (phase: ConstructionPhase) => number;
}

const STATUS_BAR_CLASS: Record<string, string> = {
  completed: "bg-success",
  "in-progress": "bg-accent",
  delayed: "bg-error",
  "on-hold": "bg-warning",
  cancelled: "bg-fg-subtle",
  planned: "bg-fg-subtle",
  "not-started": "bg-fg-subtle",
};

/**
 * A lightweight, dependency-free Gantt-style bar per phase — plain
 * proportional divs on a shared date scale, not a charting library. Desktop
 * gets the real timeline; narrow viewports fall back to a simple stacked
 * list (§27's "sensible mobile fallback," not a shrunk chart).
 */
export function ConstructionTimelineChart({ phases, effectiveProgressOf }: ConstructionTimelineChartProps) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const dates = sorted.flatMap((p) => [p.startDate, p.endDate, p.actualStartDate, p.actualEndDate].filter((d): d is string => !!d));
  const today = new Date();

  if (dates.length === 0) {
    return <p className="text-body-sm text-fg-subtle">Add planned dates to phases to see the timeline.</p>;
  }

  const allTimes = [...dates.map((d) => new Date(d).getTime()), today.getTime()];
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const span = Math.max(1, maxTime - minTime);
  const percentOf = (d: string) => Math.min(100, Math.max(0, ((new Date(d).getTime() - minTime) / span) * 100));
  const todayPercent = ((today.getTime() - minTime) / span) * 100;

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop/tablet: proportional bar chart */}
      <div className="hidden overflow-x-auto scrollbar-none sm:block">
        <div className="min-w-[640px]">
          <div className="relative flex flex-col gap-2">
            {todayPercent >= 0 && todayPercent <= 100 && (
              <div className="border-accent pointer-events-none absolute top-0 bottom-0 border-l border-dashed" style={{ left: `${todayPercent}%` }} />
            )}
            {sorted.map((phase) => {
              const delay = deriveScheduleDelay(phase.endDate, phase.actualEndDate, phase.status);
              const plannedStart = phase.startDate ? percentOf(phase.startDate) : undefined;
              const plannedEnd = phase.endDate ? percentOf(phase.endDate) : undefined;
              const barClass = STATUS_BAR_CLASS[phase.status] ?? "bg-accent";
              return (
                <Link
                  key={phase.id}
                  href={`/admin/construction/${phase.id}`}
                  className="hover:bg-surface flex items-center gap-3 rounded-md px-1 py-1 transition-colors"
                >
                  <span className="text-body-sm text-fg w-36 shrink-0 truncate">{phase.name}</span>
                  <span className="bg-surface relative h-5 flex-1 overflow-hidden rounded-full">
                    {plannedStart !== undefined && plannedEnd !== undefined && (
                      <span
                        className={`absolute top-0 h-full rounded-full opacity-90 ${barClass}`}
                        style={{ left: `${plannedStart}%`, width: `${Math.max(1, plannedEnd - plannedStart)}%` }}
                      />
                    )}
                  </span>
                  <span className="text-caption text-fg-subtle w-14 shrink-0 text-right tabular-nums">{effectiveProgressOf(phase)}%</span>
                  {delay.isDelayed && <span className="text-caption text-error w-16 shrink-0 text-right">+{delay.daysDelayed}d</span>}
                </Link>
              );
            })}
          </div>
          <p className="text-caption text-fg-subtle mt-2">Dashed line marks today ({formatDate(today)}).</p>
        </div>
      </div>

      {/* Mobile: simple stacked list, not a shrunk chart */}
      <div className="flex flex-col gap-2 sm:hidden">
        {sorted.map((phase) => (
          <Link key={phase.id} href={`/admin/construction/${phase.id}`} className="border-border bg-surface-raised flex flex-col gap-1.5 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-sm text-fg font-medium">{phase.name}</span>
              <StatusBadge status={phase.status} />
            </div>
            <ProgressBar value={effectiveProgressOf(phase)} />
          </Link>
        ))}
      </div>
    </div>
  );
}

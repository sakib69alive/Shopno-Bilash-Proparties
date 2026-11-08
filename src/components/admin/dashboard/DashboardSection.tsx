import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A titled group of numbers. The ones you check every day stay open; the rest fold away
 * (`collapsed`) so the page reads as a short summary, not a wall of figures.
 */
export function DashboardSection({ title, children, collapsed = false }: { title: string; children: ReactNode; collapsed?: boolean }) {
  return (
    <details open={!collapsed} className="group">
      <summary className="text-fg mb-4 flex cursor-pointer list-none items-center gap-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="text-h5 font-semibold tracking-tight">{title}</span>
        <span aria-hidden className="bg-border h-px flex-1" />
        <ChevronDown aria-hidden className="text-fg-subtle size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{children}</div>
    </details>
  );
}

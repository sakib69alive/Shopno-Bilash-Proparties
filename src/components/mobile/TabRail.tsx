"use client";

import { cn } from "@/lib/utils";

export interface Tab {
  value: string;
  label: string;
  count?: number;
}

export interface TabRailProps {
  tabs: Tab[];
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name for the tab list, e.g. "Gallery category". */
  label: string;
  className?: string;
}

/**
 * Filter tabs for the phone pages: plain text on a hairline with a short
 * green underline under the active one, the count beside each label. Lighter
 * and more refined than boxed pills; scrolls sideways when there are many.
 * Like `Rail`, place it outside any `Container`.
 */
export function TabRail({ tabs, value, onValueChange, label, className }: TabRailProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("no-scrollbar border-border flex gap-7 overflow-x-auto border-b px-[var(--gutter)]", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "relative h-12 shrink-0 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-200",
              active ? "text-fg" : "text-fg-subtle",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-fg-subtle ml-1.5 text-xs font-medium tabular-nums">{tab.count}</span>
            )}
            <span
              aria-hidden
              className={cn(
                "bg-accent absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

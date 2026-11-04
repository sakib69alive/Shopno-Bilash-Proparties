"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Chip {
  value: string;
  label: string;
  count?: number;
  /** When set the chip is a link (e.g. a filtered URL) instead of a button. */
  href?: string;
}

export interface ChipRailProps {
  chips: Chip[];
  value: string;
  onValueChange?: (value: string) => void;
  /** Accessible name for the group, e.g. "Property type". */
  label: string;
  className?: string;
}

const CHIP =
  "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-[color,background-color,transform] duration-150 active:scale-[0.97]";

/** Single-select pill chips in a swipe rail. Like `Rail`, place it outside any `Container`. */
export function ChipRail({ chips, value, onValueChange, label, className }: ChipRailProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("no-scrollbar flex gap-2 overflow-x-auto overscroll-x-contain px-[var(--gutter)]", className)}
    >
      {chips.map((chip) => {
        const selected = chip.value === value;
        const classes = cn(
          CHIP,
          selected
            ? "bg-accent text-accent-foreground border-accent"
            : "bg-surface-raised text-fg border-border-strong",
        );
        const content = (
          <>
            {chip.label}
            {chip.count !== undefined && (
              <span className={cn("text-xs tabular-nums", selected ? "text-accent-foreground/80" : "text-fg-subtle")}>
                {chip.count}
              </span>
            )}
          </>
        );
        return chip.href ? (
          <Link key={chip.value} href={chip.href} aria-current={selected ? "true" : undefined} className={classes}>
            {content}
          </Link>
        ) : (
          <button
            key={chip.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange?.(chip.value)}
            className={classes}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

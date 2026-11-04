import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal swipe rail. Place it directly in the page (outside any
 * `Container`): it bleeds to both screen edges and pads itself with the
 * gutter, so the first card lines up with the page content while the next
 * card peeks in from the right — the cue that it scrolls. Children set their
 * own width (e.g. `w-[72vw] max-w-[300px]`) and get `snap-start`.
 */
export function Rail({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-[var(--gutter)] px-[var(--gutter)] pb-1 *:shrink-0 *:snap-start",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

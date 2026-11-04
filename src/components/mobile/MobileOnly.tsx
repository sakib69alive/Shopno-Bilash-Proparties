import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps content that exists only in the phone/tablet layout (below `lg`).
 * `display: none` removes it from layout and the accessibility tree on
 * desktop — but the markup still ships, so never put a `priority` image in
 * here (a hidden image is still preloaded).
 */
export function MobileOnly({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("lg:hidden", className)} {...props} />;
}

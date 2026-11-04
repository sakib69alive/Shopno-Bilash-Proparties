import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps the existing desktop sections so they stay exactly as they are
 * from `lg` up and disappear below it. Same caveat as `MobileOnly`: the
 * markup still ships, so a hidden `priority` image would still preload.
 */
export function DesktopOnly({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("hidden lg:block", className)} {...props} />;
}

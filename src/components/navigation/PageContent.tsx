"use client";

import type { ReactNode } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { cn } from "@/lib/utils";
import { useMobileChrome } from "@/components/mobile/MobileChrome";
import { useHeaderVariant } from "./HeaderVariantContext";

/**
 * Reserves space under the fixed header for normal ("solid") pages. Pages
 * that opt into `usePageHeaderVariant("overlay")` for a full-bleed hero get
 * no top padding — their hero is meant to sit behind the transparent header.
 * Also the one place the route-change entrance transition is applied, so
 * individual pages never need to wire that up themselves.
 */
export function PageContent({ children }: { children: ReactNode }) {
  const variant = useHeaderVariant();
  const { barOverlay } = useMobileChrome();

  return (
    // Below `lg` the phone top bar is a solid bar, not a transparent header over
    // a hero, so every page clears it whichever header variant it asks for.
    <main
      className={cn(
        "flex-1 lg:pt-0",
        !barOverlay && "pt-[calc(var(--m-topbar-h)+env(safe-area-inset-top))]",
        variant === "solid" && "lg:pt-16",
      )}
    >
      <PageTransition>{children}</PageTransition>
    </main>
  );
}

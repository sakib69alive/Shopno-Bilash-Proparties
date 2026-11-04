"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { Logo } from "@/components/navigation/Logo";
import { useMobileChrome } from "./MobileChrome";
import { useSearch } from "@/components/search/SearchContext";
import { cn } from "@/lib/utils";
import { getMobileTitle, type RouteTitleData } from "@/lib/routeTitles";
import type { CompanySettings } from "@/types/settings";

// Over a hero the bar stays transparent for as long as the photo is behind it, then turns solid across this many px
// as the photo's bottom edge slides up past the bar.
const FADE_DISTANCE = 48;

const BAR =
  "fixed inset-x-0 top-0 z-40 flex items-center px-[var(--gutter)] pt-[env(safe-area-inset-top)] h-[calc(var(--m-topbar-h)+env(safe-area-inset-top))] lg:hidden";

// Solid, not glass: blurred translucency turns murky grey over dark sections. Instead the bar is plain page colour
// and, once content scrolls under it, a long soft shadow fades in below it — no line, no hard edge.
function BarGlass({ progress, clear }: { progress: number; clear: boolean }) {
  const opacity = clear ? progress : 1;
  return (
    <span
      aria-hidden
      style={{ opacity }}
      className={cn(
        "bg-bg pointer-events-none absolute inset-0",
        progress >= 1 ? "shadow-[0_10px_24px_-10px_rgb(var(--shadow-color)/0.16)]" : "shadow-none",
      )}
    />
  );
}

const ROUND_BUTTON =
  "bg-surface text-fg flex size-10 items-center justify-center rounded-full transition-[transform,background-color] duration-150 active:scale-90 active:bg-border";

// Over a hero photo the round buttons turn into white-tinted glass instead of the stone chip.
const OVER_BUTTON = (over: boolean) => (over ? "bg-white/20 text-white active:bg-white/30" : "");

/** Where "back" goes when there is no in-app history to return to (a page opened from a shared link). */
function parentPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // /projects/x/units/y → /projects/x ("/projects/x/units" is not a page).
  segments.pop();
  if (segments[segments.length - 1] === "units") segments.pop();
  return segments.length ? `/${segments.join("/")}` : "/";
}

/**
 * Phone top bar — fixed, solid with a soft shadow once scrolled. The
 * home page gets the brand row (logo + greeting line); every other page gets
 * back, the logo, the page title and search. Replaces the desktop `Header`
 * below `lg`.
 */
export function TopBar({ settings, routeTitleData }: { settings: CompanySettings | null; routeTitleData: RouteTitleData }) {
  const pathname = usePathname();
  const router = useRouter();
  const { openSearch } = useSearch();
  const { barOverlay } = useMobileChrome();
  // Counts route changes since the shell mounted: a first visit to a page
  // has nothing in-app to go "back" to, so it goes to the parent instead of
  // leaving the site.
  const visits = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  // 0 at the top of the page → 1 once scrolled FADE_DISTANCE px (quantised so scrolling does not re-render on every pixel).
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const hero = barOverlay ? document.querySelector("[data-bar-hero]") : null;
      let raw: number;
      if (hero) {
        // Solid only once the hero photo has scrolled out from behind the bar.
        const barBottom = headerRef.current?.getBoundingClientRect().bottom ?? 68;
        raw = (barBottom + FADE_DISTANCE - hero.getBoundingClientRect().bottom) / FADE_DISTANCE;
      } else {
        raw = window.scrollY > 4 ? 1 : 0;
      }
      const next = Math.round(Math.min(1, Math.max(0, raw)) * 20) / 20;
      setProgress((c) => (c === next ? c : next));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [barOverlay]);

  useEffect(() => {
    visits.current += 1;
  }, [pathname]);

  // Over a full-bleed hero, until the page scrolls: no bar background, light logo, white-on-glass buttons.
  const over = barOverlay && progress < 0.5;

  if (pathname === "/") {
    return (
      <header className={BAR}>
        <BarGlass progress={progress} clear={barOverlay} />
        <div className="relative flex w-full items-center gap-4">
          <Logo
            src={settings?.logo}
            mode={settings?.logoMode}
            displayName={settings?.displayName}
            className="h-12 sm:h-12"
          />
          <span aria-hidden className="bg-border-strong h-7 w-px shrink-0" />
          <p className="font-serif-display text-fg min-w-0 flex-1 text-[1.1875rem] leading-[1.15]">
            Let&rsquo;s find your next home
          </p>
        </div>
      </header>
    );
  }

  const title = getMobileTitle(pathname, routeTitleData);

  function goBack() {
    if (visits.current > 1) router.back();
    else router.push(parentPath(pathname));
  }

  return (
    <header ref={headerRef} className={BAR}>
      <BarGlass progress={progress} clear={barOverlay} />
      <div className="relative flex w-full items-center gap-3">
        <button type="button" onClick={goBack} aria-label="Go back" className={cn(ROUND_BUTTON, OVER_BUTTON(over), "shrink-0")}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        {/* The logo keeps its own colours everywhere; over a photo it sits in a page-coloured pill so it stays readable (the pill blends into the solid bar, so nothing shifts). */}
        <span className="bg-bg -mx-1 shrink-0 rounded-full px-3 py-0.5">
          <Logo
            src={settings?.logo}
            mode={settings?.logoMode}
            displayName={settings?.displayName}
            className="h-11 sm:h-11"
          />
        </span>
        <span aria-hidden className={cn("h-8 w-px shrink-0", over ? "bg-white/40" : "bg-border-strong")} />
        <p className={cn("font-serif-display min-w-0 flex-1 text-[1.625rem] leading-[1.05] line-clamp-2 transition-colors duration-300", over ? "text-white" : "text-fg")}>
          {title}
        </p>
        <button type="button" onClick={openSearch} aria-label="Search" className={cn(ROUND_BUTTON, OVER_BUTTON(over), "shrink-0")}>
          <Search aria-hidden className="size-[18px]" />
        </button>
      </div>
    </header>
  );
}

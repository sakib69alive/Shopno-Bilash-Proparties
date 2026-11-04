"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { markCeremonyHandledNextEntrance } from "@/lib/pageEntranceCoordination";
import { getRouteTitle, type RouteTitleData } from "@/lib/routeTitles";
import { cn } from "@/lib/utils";

type Stage = "idle" | "curtain" | "loader" | "exit";

// Stage 1 — "Entering {destination}" curtain.
const CURTAIN_MS = 1100;
// Phones get the same ceremony, tuned shorter — the full ~2.4s on every tap is too slow on a handset.
const PHONE_TIMING = { curtain: 560, minLoader: 260, hold: 100, fade: 360 };
const DESKTOP_TIMING = { curtain: CURTAIN_MS, minLoader: 500, hold: 180, fade: 600 };
// The "Entering …" mark's own 500ms transition-delay lives directly in
// its Tailwind class below (`delay-[500ms]`) — Tailwind's JIT scanner
// needs a literal class string, not one built from this constant.
// Stage 2 — the breathing-glow + progress loader — see globals.css's
// `.portal-loader-*` utilities.
const MAX_WAIT_MS = 2500;
const POLL_MS = 60;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * The public site's page-to-page transition — the same two-part sequence
 * as the Owner Portal's `PortalPageLoader` (a cinematic "Entering {page}"
 * curtain, then the breathing-glow site-loader once the real navigation
 * fires), replacing the earlier `NavigationTransition` wipe so both halves
 * of the site share one transition language. Destination titles resolve
 * through the public site's own live-CMS-aware `getRouteTitle` (project/
 * unit/news names, not just static labels) instead of the portal's small
 * nav-label list.
 *
 * Same global click-interception approach as before: one `document`-level
 * listener, external/download/`mailto:`/`tel:`/modified-click/reduced-
 * motion navigations left alone. `markCeremonyHandledNextEntrance()` still
 * fires so `<PageTransition>`'s own fade doesn't play a second time right
 * after this ceremony's own reveal.
 */
export function SitePageLoader({ routeTitleData }: { routeTitleData: RouteTitleData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("idle");
  const [curtainActive, setCurtainActive] = useState(false);
  const [title, setTitle] = useState("");
  const [fill, setFill] = useState(0);
  const [compact, setCompact] = useState(false);
  const runningRef = useRef(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") ?? "";
      if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      event.preventDefault();
      if (runningRef.current) return;
      runningRef.current = true;

      const phone = window.matchMedia("(max-width: 1023.98px)").matches;
      const timing = phone ? PHONE_TIMING : DESKTOP_TIMING;
      setCompact(phone);
      const destPath = url.pathname;
      const destHref = destPath + url.search + url.hash;

      setTitle(getRouteTitle(destPath, routeTitleData, url.hash));
      setFill(0);
      setCurtainActive(false);
      setStage("curtain");
      requestAnimationFrame(() => requestAnimationFrame(() => setCurtainActive(true)));

      (async () => {
        await wait(timing.curtain);

        markCeremonyHandledNextEntrance();
        router.push(destHref);
        setStage("loader");
        const loaderStartedAt = Date.now();
        requestAnimationFrame(() => setFill(70));

        const deadline = Date.now() + MAX_WAIT_MS;
        while (pathnameRef.current !== destPath && Date.now() < deadline) {
          await wait(POLL_MS);
        }

        const elapsed = Date.now() - loaderStartedAt;
        await wait(Math.max(0, timing.minLoader - elapsed));
        setFill(100);
        await wait(timing.hold);

        setStage("exit");
        await wait(timing.fade);
        setStage("idle");
        runningRef.current = false;
      })();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, routeTitleData]);

  if (stage === "idle") return null;

  const inCurtain = stage === "curtain";
  const markVisible = inCurtain && curtainActive;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-bg pointer-events-none fixed inset-0 z-[200] overflow-hidden transition-opacity ease-[cubic-bezier(0.65,0,0.35,1)]",
        stage === "exit" ? (compact ? "opacity-0 duration-[360ms]" : "opacity-0 duration-[600ms]") : compact ? "opacity-100 duration-[560ms]" : "opacity-100 duration-[1100ms]",
      )}
    >
      {/* The scale transform lives on this inner, non-fixed wrapper rather
          than the outer `fixed` element — a `fixed` element animating its
          own `transform` is the exact compositor bug `Header.tsx` documents
          avoiding ("the header's painted layer detaches from its actual
          position and renders stale, torn, or overlapping page content when
          scrolling"). This overlay sits alongside that same fixed Header on
          every public page, so it must avoid the pattern too. */}
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center transition-transform ease-[cubic-bezier(0.65,0,0.35,1)]",
          compact ? "duration-[560ms]" : "duration-[1100ms]",
          inCurtain && !curtainActive ? "scale-[1.08]" : "scale-100",
        )}
      >
        {/* Stage 1 — "Entering {destination}" */}
        {inCurtain && (
          <div
            className={cn(
              "absolute flex flex-col items-center text-center transition-all ease-out",
              compact ? "duration-[360ms]" : "duration-[600ms]",
              markVisible ? (compact ? "translate-y-0 opacity-100 delay-[200ms]" : "translate-y-0 opacity-100 delay-[500ms]") : "translate-y-2.5 opacity-0",
            )}
          >
            <p className="text-fg-subtle text-xs tracking-[0.3em] uppercase">Entering</p>
            <p className="text-display-m text-fg mt-3">{title}</p>
          </div>
        )}

        {/* Stage 2 — breathing glow + progress loader */}
        {!inCurtain && (
          <div className="flex flex-col items-center">
            <div className="portal-loader-glow bg-premium/35 absolute size-[420px] rounded-full blur-[60px]" />
            <p className="portal-loader-mark text-h4 relative tracking-wide text-fg">
              SHOPNO BILASH <span className="text-fg-subtle font-normal">PROPERTIES</span>
            </p>
            <div className="bg-border relative mt-6 h-px w-[120px] overflow-hidden rounded-full">
              <div
                className="bg-fg absolute inset-y-0 left-0 rounded-full transition-[width] duration-[400ms] ease-[var(--ease-standard)]"
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

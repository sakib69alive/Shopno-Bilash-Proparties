"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getOwnerPortalRouteTitle } from "@/lib/ownerPortalRouteTitle";
import { cn } from "@/lib/utils";
import type { OwnerNavItem } from "@/config/navigation";

type Stage = "idle" | "curtain" | "loader" | "exit";

// Stage 1 — "Entering {destination}" curtain, ported from an earlier
// project's own Home→Store cinematic hand-off (scale 1.08→1 + fade in;
// the "Entering" label + destination name settle in 500ms into it).
const CURTAIN_MS = 1100;
// The "Entering …" mark's own 500ms transition-delay lives directly in
// its Tailwind class below (`delay-[500ms]`) — Tailwind's JIT scanner
// needs a literal class string, not one built from this constant.
// Stage 2 — the breathing-glow + progress loader, ported from that same
// project's generic `#site-loader` (used for every page, not just one
// hand-off) — see globals.css's `.portal-loader-*` utilities.
const MIN_LOADER_MS = 500;
const HOLD_AFTER_FULL_MS = 180;
const FADE_MS = 600;
const MAX_WAIT_MS = 2500;
const POLL_MS = 60;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * The Owner Portal's page-to-page transition — ported at the user's
 * explicit request from an earlier project's own two-part sequence: a
 * cinematic "Entering {page}" curtain first, then that project's
 * breathing-glow site-loader once the real navigation fires. The public
 * site's `SitePageLoader` later adopted this exact same design (per the
 * user's request that both halves of the site share one transition
 * language) — the two are near-identical siblings, differing only in how
 * each resolves a destination's title. Same click-interception approach
 * either way (one document-level listener; external/download/modified-
 * click/reduced-motion navigations are left alone).
 *
 * Both stages need the classic "mount in the hidden state, flip to the
 * visible state a frame later" two-step (`curtainActive`) — applying the
 * final CSS classes on the very first paint gives the browser nothing to
 * transition *from*, so the entrance would just snap instead of animating.
 */
export function PortalPageLoader({ navItems }: { navItems: OwnerNavItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("idle");
  const [curtainActive, setCurtainActive] = useState(false);
  const [title, setTitle] = useState("");
  const [fill, setFill] = useState(0);
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

      const destPath = url.pathname;
      const destHref = destPath + url.search + url.hash;

      // Start fetching the destination now so the network work overlaps the
      // curtain animation (timings unchanged — the page is just ready sooner).
      router.prefetch(destPath);

      setTitle(getOwnerPortalRouteTitle(destPath, navItems));
      setFill(0);
      setCurtainActive(false);
      setStage("curtain");
      requestAnimationFrame(() => requestAnimationFrame(() => setCurtainActive(true)));

      (async () => {
        await wait(CURTAIN_MS);

        router.push(destHref);
        setStage("loader");
        const loaderStartedAt = Date.now();
        requestAnimationFrame(() => setFill(70));

        const deadline = Date.now() + MAX_WAIT_MS;
        while (pathnameRef.current !== destPath && Date.now() < deadline) {
          await wait(POLL_MS);
        }

        const elapsed = Date.now() - loaderStartedAt;
        await wait(Math.max(0, MIN_LOADER_MS - elapsed));
        setFill(100);
        await wait(HOLD_AFTER_FULL_MS);

        setStage("exit");
        await wait(FADE_MS);
        setStage("idle");
        runningRef.current = false;
      })();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, navItems]);

  if (stage === "idle") return null;

  const inCurtain = stage === "curtain";
  const markVisible = inCurtain && curtainActive;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-bg pointer-events-none fixed inset-0 z-[200] overflow-hidden transition-opacity ease-[cubic-bezier(0.65,0,0.35,1)]",
        stage === "exit" ? "opacity-0 duration-[600ms]" : "opacity-100 duration-[1100ms]",
      )}
    >
      {/* The scale transform lives on this inner, non-fixed wrapper rather
          than the outer `fixed` element — a `fixed` element animating its
          own `transform` is the exact compositor bug `Header.tsx` (public
          site) documents avoiding, and the public site's sibling
          `SitePageLoader` hit it for real once this same pattern sat next
          to that fixed header. Kept transform-free here too so the two
          stay identical, not just visually. */}
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center transition-transform duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
          inCurtain && !curtainActive ? "scale-[1.08]" : "scale-100",
        )}
      >
        {/* Stage 1 — "Entering {destination}" */}
        {inCurtain && (
          <div
            className={cn(
              "absolute flex flex-col items-center text-center transition-all duration-[600ms] ease-out",
              markVisible ? "translate-y-0 opacity-100 delay-[500ms]" : "translate-y-2.5 opacity-0",
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

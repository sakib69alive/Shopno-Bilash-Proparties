"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { DesktopNav } from "./DesktopNav";
import { Logo } from "./Logo";
import { MenuButton } from "./MenuButton";
import { MobileNav } from "./MobileNav";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { SavedTrigger } from "@/components/saved/SavedTrigger";
import { cn } from "@/lib/utils";
import type { CompanySettings } from "@/types/settings";

// Where along the header's own width to sample the page content behind it —
// nearer the right edge, where the nav links/icons actually cluster (the
// logo doesn't need this: it carries its own contrast already, and the CTA
// pill has its own solid fill regardless of tone).
const SAMPLE_X_FROM_RIGHT = 100;

// Hysteresis around the compact/large switch, rather than one single
// threshold — Lenis (the site's smooth-scroll) settles in sub-pixel steps
// around a resting position, and a single threshold re-fires both state
// setters every one of those steps right at the boundary, which read as a
// flicker between the two sizes. A dead zone (COMPACT_EXIT < y <=
// COMPACT_ENTER) keeps whichever state is already active.
const COMPACT_ENTER = 96;
const COMPACT_EXIT = 56;

// Same reasoning for show/hide-on-scroll: ignore any scroll delta smaller
// than this between two samples (Lenis momentum, not a deliberate flick),
// so the header doesn't flip visibility on noise.
const MIN_SCROLL_DELTA = 6;

/**
 * Global site header — permanently transparent (no solid/frosted fill; that
 * read as a heavy opaque bar once scrolled), on every page. It's large at
 * the very top of the page (a bigger logo, matching a hero's own scale) and
 * shrinks to its normal compact size as soon as the visitor scrolls past
 * `COMPACT_THRESHOLD`; once compact, it hides on scroll-down and reappears
 * (still compact) on scroll-up, so it's out of the way while reading but a
 * scroll-up gesture always brings navigation back. Nav content also switches
 * between a dark-on-light "default" tone and a light-on-dark "inverted" tone
 * depending on what's actually scrolled underneath it right now, detected
 * live rather than assumed:
 *
 * `mix-blend-mode: difference` was tried first (auto-invert with zero
 * tracking) but doesn't actually work for this — a `position: fixed`
 * header is always its own stacking context, so a blend mode set on its
 * children can only ever see OTHER content painted inside that same fixed
 * box, never the page scrolling behind it. The text just stayed a flat,
 * unchanging white no matter what was underneath.
 *
 * So instead: any page section that's genuinely dark (hero imagery, the
 * footer's dark band, a closing dark CTA, etc.) is marked with
 * `data-header-tone="dark"` on its own outermost element — including a
 * dark element that's only PART of a section (e.g. `FounderHero`'s top
 * scrim), since this checks actual element bounds, not "is this page/
 * section dark" as a whole. On every scroll (rAF-throttled) this checks
 * whether any dark-marked element's current bounding rect covers a fixed
 * point just inside the header's own band. Geometry, not hit-testing
 * (`elementFromPoint`) — deliberately: hit-testing silently skips
 * `pointer-events-none` elements, which is exactly how these dark scrims
 * are usually marked so they don't themselves block clicks.
 */
export function Header({ settings }: { settings: CompanySettings | null }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [sampledTone, setSampledTone] = useState<"default" | "inverted">("default");
  // `compact` = past COMPACT_THRESHOLD (small logo, eligible to hide/reveal);
  // `hidden` only ever applies once compact — the large top-of-page state is
  // never hidden, so there's always a way back to a visible header.
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // MobileNav is its own solid light sheet drawn above everything once
  // open — geometry-only dark detection below can't "see" that it's
  // occluding whatever dark section happens to be at the same scroll
  // position, so this case overrides the sampled value directly instead.
  const tone = mobileOpen ? "default" : sampledTone;
  const mobileNavId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeMobileNav() {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }

  useEffect(() => {
    if (mobileOpen) return;

    let raf = 0;
    let lastScrollY = window.scrollY;
    let isCompact = window.scrollY > COMPACT_ENTER;

    function sample() {
      const header = headerRef.current;
      if (!header) return;
      const x = Math.max(0, window.innerWidth - SAMPLE_X_FROM_RIGHT);
      const y = header.getBoundingClientRect().height / 2;

      let dark = false;
      for (const el of document.querySelectorAll<HTMLElement>('[data-header-tone="dark"]')) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          dark = true;
          break;
        }
      }
      setSampledTone(dark ? "inverted" : "default");

      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;

      if (isCompact && scrollY <= COMPACT_EXIT) {
        isCompact = false;
      } else if (!isCompact && scrollY > COMPACT_ENTER) {
        isCompact = true;
      }

      if (!isCompact) {
        setCompact(false);
        setHidden(false);
      } else {
        setCompact(true);
        if (Math.abs(delta) > MIN_SCROLL_DELTA) {
          setHidden(delta > 0);
        }
      }

      lastScrollY = scrollY;
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        sample();
        raf = 0;
      });
    }

    // A plain synchronous `sample()` here can run a frame before the page's
    // own layout (hero height, fonts, etc.) has actually settled — the geometry
    // it reads is momentarily stale, so it under- or over-reports "dark" on the
    // very first paint and then never self-corrects until something scrolls.
    // Two rAFs reliably wait a full layout+paint cycle before that first read.
    let initialRaf = requestAnimationFrame(() => {
      initialRaf = requestAnimationFrame(sample);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      cancelAnimationFrame(initialRaf);
    };
    // Re-sample on route change too — navigating can land the header over
    // completely different content at the same scroll position, and a
    // client-side transition doesn't reliably fire a native "scroll" event.
  }, [pathname, mobileOpen]);

  // Close the mobile panel automatically if the viewport grows past the
  // mobile breakpoint (e.g. rotating a tablet) so it can't get stuck open.
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    function onChange() {
      if (mql.matches) setMobileOpen(false);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const effectivelyHidden = hidden && !mobileOpen;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-transparent bg-transparent transition-transform duration-300 ease-[var(--ease-standard)]",
          effectivelyHidden && "-translate-y-full",
        )}
      >
        <Container>
          <div
            className={cn(
              "flex items-center justify-between transition-[height] duration-300 ease-[var(--ease-standard)]",
              compact ? "h-16" : "h-20 sm:h-24 lg:h-28",
            )}
          >
            <Logo
              src={settings?.logo}
              mode={settings?.logoMode}
              displayName={settings?.displayName}
              tone={tone}
              className={compact ? undefined : "h-16 sm:h-20 lg:h-24"}
            />
            <div className="flex items-center gap-4 lg:gap-6">
              <DesktopNav tone={tone} />
              <SearchTrigger tone={tone} variant="full" />
              <SavedTrigger tone={tone} />
              {settings?.showPublicSignInLink && (
                <Link
                  href="/login"
                  className={cn(
                    "hidden items-center gap-1.5 rounded-md px-2 text-body-sm font-medium transition-colors sm:flex",
                    tone === "inverted" ? "text-white/90 hover:bg-white/10" : "text-fg-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <LogIn aria-hidden className="size-4" />
                  Sign In
                </Link>
              )}
              <MenuButton
                ref={menuButtonRef}
                open={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                tone={tone}
                controlsId={mobileNavId}
              />
            </div>
          </div>
        </Container>
      </header>

      <MobileNav id={mobileNavId} open={mobileOpen} onClose={closeMobileNav} showSignIn={settings?.showPublicSignInLink} />
    </>
  );
}

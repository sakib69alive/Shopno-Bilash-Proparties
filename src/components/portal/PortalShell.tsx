"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, LayoutDashboard, Home, Wallet, HardHat, FileText, UserCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/navigation/Logo";
import { PortalPageLoader } from "@/components/portal/PortalPageLoader";
import { ArchitecturalMotif } from "@/components/ui/ArchitecturalMotif";
import { logoutAction } from "@/lib/auth/actions";
import type { OwnerNavItem } from "@/config/navigation";
import type { CompanySettings } from "@/types/settings";

export interface PortalShellProps {
  navItems: OwnerNavItem[];
  ownerName: string;
  unreadNotifications: number;
  settings: CompanySettings | null;
  children: React.ReactNode;
}

/**
 * Icons resolved client-side, keyed by label, rather than carried on
 * `navItems` — a `LucideIcon` component reference can't cross the
 * Server → Client Component boundary as a prop (RSC only allows plain
 * serializable data), so `buildOwnerNav` (a Server Component's import)
 * sends plain `{label, href}` and this Client Component owns the mapping.
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  Home: LayoutDashboard,
  "My Property": Home,
  Payments: Wallet,
  Construction: HardHat,
  Documents: FileText,
  Notifications: Bell,
  Profile: UserCircle,
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/**
 * Chapter 3's premium, mobile-first portal chrome — deliberately a fresh
 * component, not `SidebarShell` (that one is the admin panel's dense
 * internal-tool shell; this is meant to feel like "a private digital
 * home," per Prompt 1's own framing). Mobile gets a fixed bottom tab bar
 * (the primary experience, brief §12); the notification bell and profile
 * avatar live in the top bar instead of competing for bottom-bar space.
 * Desktop gets a full labelled sidebar — never a cut-down version of the
 * mobile experience. Visual pass: solid-fill active states (not just a
 * hairline), an avatar badge next to the owner's name, and one restrained
 * champagne accent line under the logo — the portal's one deliberate
 * "private club" signature, used nowhere else so it stays special.
 */
export function PortalShell({ navItems, ownerName, unreadNotifications, settings, children }: PortalShellProps) {
  const pathname = usePathname();
  const homeHref = navItems[0]?.href ?? "/portal";
  const notificationsItem = navItems.find((i) => i.label === "Notifications");
  const profileItem = navItems.find((i) => i.label === "Profile");
  const tabBarItems = navItems.filter((i) => i.label !== "Notifications" && i.label !== "Profile").slice(0, 5);

  const [scrolled, setScrolled] = useState(false);
  // Optimistic highlight: the capsule moves the instant a tab is tapped, not after the next page has loaded.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  // Same glass as the public site's bottom bar; weak phones / reduced-motion get the cheap flat tint (no backdrop blur).
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak = (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);
    if (weak || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setLite(true);
  }, []);
  const pending = tapped && tapped.from === pathname ? tapped.href : null;

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY > 4;
      setScrolled((c) => (c === next ? c : next));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string) {
    return href === homeHref ? pathname === href : pathname.startsWith(href);
  }

  // Swipe left/right anywhere on a phone to step to the next/previous tab (Home ↔ My Property ↔ Payments …),
  // the same order as the bottom bar. Ignored when the finger starts on something that scrolls or pans
  // sideways itself (photo strips, floor plans, tab rails), on a form field, near the screen edge (the
  // phone's own back gesture), or while a sheet is open — so it never fights real content.
  const router = useRouter();
  const tabHrefs = tabBarItems.map((i) => i.href).join("|");
  useEffect(() => {
    const hrefs = tabHrefs.split("|");
    const currentIndex = hrefs.findIndex((h) => (h === homeHref ? pathname === h : pathname.startsWith(h)));
    if (currentIndex < 0) return;
    // No page-swipe on the Home screen: there the blueprint card swipes between residences, and the two gestures collided.
    if (pathname === homeHref) return;

    let start: { x: number; y: number; t: number } | null = null;

    function blocked(target: EventTarget | null): boolean {
      if (document.body.style.position === "fixed") return true; // a bottom sheet / dialog is open
      for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (el.matches("input, textarea, select, [contenteditable], [data-no-swipe]")) return true;
        const style = getComputedStyle(el);
        if (style.touchAction !== "auto" && style.touchAction !== "manipulation") return true; // pan/zoom areas
        if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
      }
      return false;
    }

    function onStart(e: TouchEvent) {
      start = null;
      if (e.touches.length !== 1 || !window.matchMedia("(max-width: 1023.98px)").matches) return;
      const t = e.touches[0];
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
      if (blocked(e.target)) return;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    }
    function onMove(e: TouchEvent) {
      if (e.touches.length > 1) start = null; // a pinch, not a swipe
    }
    function onEnd(e: TouchEvent) {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < 700;
      start = null;
      if (!quick || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
      const next = hrefs[currentIndex + (dx < 0 ? 1 : -1)];
      if (!next) return;
      // Click the bottom-bar link instead of pushing the route: a swipe then runs exactly what a tap runs, including
      // PortalPageLoader's "Entering …" ceremony, which listens for link clicks (a bare push skipped it).
      const link = document.querySelector<HTMLAnchorElement>(`nav[aria-label="Portal"] a[href="${next}"]`);
      if (link) {
        link.click();
        return;
      }
      setTapped({ href: next, from: pathname });
      router.push(next);
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pathname, tabHrefs, homeHref, router]);

  return (
    <div className="bg-bg flex min-h-screen">
      <PortalPageLoader navItems={navItems} />

      {/* Desktop sidebar */}
      <aside className="border-border bg-gradient-to-b from-surface to-surface-raised fixed inset-y-0 left-0 z-20 hidden h-screen w-72 flex-col border-r lg:flex">
        <div className="border-premium/40 flex h-20 shrink-0 items-center border-b px-6">
          <Logo src={settings?.logo} mode={settings?.logoMode} displayName={settings?.displayName} />
        </div>
        <div className="px-4 pt-5">
          <div className="bg-accent-soft/60 flex items-center gap-3 rounded-xl px-4 py-4">
            <span className="bg-accent text-accent-foreground text-label flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm">
              {initials(ownerName)}
            </span>
            <div className="min-w-0">
              <p className="text-caption text-fg-subtle uppercase">Welcome back</p>
              <p className="text-h4 text-fg mt-0.5 truncate">{ownerName}</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4 py-5">
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item.label];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ease-[var(--ease-standard)]",
                  active ? "bg-accent text-accent-foreground shadow-sm" : "text-fg-muted hover:bg-surface-raised hover:text-fg",
                )}
              >
                {Icon && <Icon aria-hidden className="size-5 shrink-0" />}
                <span className={cn("text-nav flex-1", active && "font-medium")}>{item.label}</span>
                {item.label === "Notifications" && unreadNotifications > 0 && (
                  <span
                    className={cn(
                      "text-caption flex size-5 items-center justify-center rounded-full",
                      active ? "bg-accent-foreground/20 text-accent-foreground" : "bg-accent text-accent-foreground",
                    )}
                  >
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-border relative overflow-hidden border-t p-4">
          <ArchitecturalMotif
            fit="cover"
            className="text-border pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-30"
          />
          <button type="submit" className="text-fg-muted hover:bg-surface-raised hover:text-fg relative flex w-full items-center gap-3 rounded-md px-4 py-2.5 transition-colors">
            <LogOut aria-hidden className="size-4.5" />
            <span className="text-nav">Sign out</span>
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        {/* Phone top bar — fixed (never sticky), solid; a soft shadow fades in once content scrolls under it. */}
        <header
          className={cn(
            "bg-bg fixed inset-x-0 top-0 z-30 flex h-[calc(4.25rem+env(safe-area-inset-top))] items-center gap-3 px-[var(--gutter)] pt-[env(safe-area-inset-top)] transition-shadow duration-300 lg:hidden",
            scrolled && "shadow-[0_10px_24px_-10px_rgb(var(--shadow-color)/0.16)]",
          )}
        >
          <Logo src={settings?.logo} mode={settings?.logoMode} displayName={settings?.displayName} className="h-11 sm:h-11" />
          <span aria-hidden className="bg-border-strong h-8 w-px shrink-0" />
          <p className="font-serif-display text-fg min-w-0 flex-1 truncate text-[1.375rem] leading-[1.05]">Owner portal</p>
          {notificationsItem && (
            <Link
              href={notificationsItem.href}
              aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
              className="bg-surface text-fg active:bg-border relative flex size-10 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-150 active:scale-90"
            >
              <Bell aria-hidden className="size-[18px]" />
              {unreadNotifications > 0 && (
                <span aria-hidden className="bg-accent border-surface absolute top-2 right-2.5 size-2.5 rounded-full border-2" />
              )}
            </Link>
          )}
          {profileItem && (
            <Link href={profileItem.href} aria-label="Profile" className="shrink-0 transition-transform duration-150 active:scale-90">
              <span className="bg-accent text-accent-foreground text-label flex size-10 items-center justify-center rounded-full">
                {initials(ownerName)}
              </span>
            </Link>
          )}
        </header>

        <main className="flex-1 pt-[calc(4.25rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">{children}</main>

        {/* Phone bottom navigation — floating capsule; the current tab grows into a green pill showing its name. */}
        <nav aria-label="Portal" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
          <div
            style={{ borderColor: "rgb(255 255 255 / 0.28)" }}
            className="relative isolate flex h-16 items-center gap-1 rounded-full border p-1.5 shadow-[0_14px_34px_rgb(var(--shadow-color)/0.16),0_2px_6px_rgb(var(--shadow-color)/0.08)]"
          >
            <div
              aria-hidden
              style={
                lite
                  ? { backgroundColor: "rgb(28 27 25 / 0.86)" }
                  : { backgroundColor: "rgb(28 27 25 / 0.42)", backdropFilter: "blur(22px) saturate(180%)", WebkitBackdropFilter: "blur(22px) saturate(180%)" }
              }
              className="pointer-events-none absolute inset-0 -z-10 rounded-full"
            />
            {tabBarItems.map((item) => {
              const Icon = NAV_ICONS[item.label];
              const active = (pending ?? tabBarItems.find((i) => isActive(i.href))?.href) === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  onClick={() => setTapped({ href: item.href, from: pathname })}
                  className={cn(
                    "relative flex h-12 min-w-0 touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold [-webkit-tap-highlight-color:transparent] transition-[flex-grow,background-color,color] duration-200 ease-[var(--ease-standard)]",
                    active ? "bg-accent/90 text-accent-foreground grow-[2.4] px-3" : "grow text-white active:bg-white/15",
                  )}
                >
                  {Icon && <Icon aria-hidden className="size-[22px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />}
                  <span className={cn("whitespace-nowrap", active ? "tab-label-in" : "sr-only")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

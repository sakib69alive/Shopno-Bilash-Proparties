"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Heart, House, KeyRound, Menu, type LucideIcon } from "lucide-react";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { useSavedIds } from "@/hooks/useSavedProperties";
import { cn } from "@/lib/utils";
import { useMobileChrome } from "./MobileChrome";

type Tab = { key: string; label: string; icon: LucideIcon; href?: string };

const TABS: Tab[] = [
  { key: "home", label: "Home", icon: House, href: "/" },
  { key: "projects", label: "Projects", icon: Building2, href: "/projects" },
  { key: "properties", label: "Properties", icon: KeyRound, href: "/properties" },
  { key: "saved", label: "Saved", icon: Heart, href: "/saved" },
  { key: "menu", label: "Menu", icon: Menu },
];

function activeKey(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/properties")) return "properties";
  if (pathname.startsWith("/saved")) return "saved";
  // Every other page (About, Services, Enquire, …) is reached through the Menu.
  return "menu";
}

// The active tab grows into a green capsule showing its name; the others shrink to just an icon.
// `touch-manipulation` + no tap highlight keep the press feeling immediate.
const ITEM =
  "relative flex h-12 min-w-0 touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold [-webkit-tap-highlight-color:transparent] transition-[flex-grow,background-color,color] duration-200 ease-[var(--ease-standard)]";

/**
 * Phone bottom navigation — a solid floating capsule held just above the screen
 * edge (smoked frosted glass on every public page). Only the
 * current tab shows its label, inside a green capsule that grows into place
 * as you move between tabs. Steps aside while a detail page's `ActionBar`
 * is mounted.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const { hasActionBar, menuOpen, openMenu } = useMobileChrome();
  const savedCount = useSavedIds().length;

  // Optimistic highlight: the capsule moves the instant a tab is tapped, instead of waiting for the next page to
  // finish loading (which, on a slow connection, read as lag). Dropped as soon as the route actually changes.
  const [tapped, setTapped] = useState<{ key: string; from: string } | null>(null);
  const pending = tapped && tapped.from === pathname ? tapped.key : null;
  const current = menuOpen ? "menu" : (pending ?? activeKey(pathname));

  // The bar is smoked-glass on every public page (see `glassStyle`): a dark translucent tint + blur, so white icons
  // stay readable whether it floats over a photo or over the ivory page background.

  // Swipe left/right to step to the next/previous tab (Home ↔ Projects ↔ Properties ↔ Saved). Shared rules
  // (what it ignores, how forgiving it is) live in `useHorizontalSwipe`.
  const router = useRouter();
  const hrefs = TABS.filter((t) => t.href).map((t) => t.href as string);
  const currentIndex = hrefs.findIndex((h) => TABS.find((t) => t.href === h)?.key === activeKey(pathname));
  useHorizontalSwipe((direction) => {
    const next = hrefs[currentIndex + direction];
    if (!next) return;
    setTapped({ key: TABS.find((t) => t.href === next)!.key, from: pathname });
    router.push(next);
  }, currentIndex >= 0 && !menuOpen);
  const glassStyle: CSSProperties = {
    backgroundColor: "rgb(28 27 25 / 0.42)",
    backdropFilter: "blur(22px) saturate(180%)",
    WebkitBackdropFilter: "blur(22px) saturate(180%)",
    borderColor: "rgb(255 255 255 / 0.28)",
    transition:
      "background-color 500ms var(--ease-standard), backdrop-filter 500ms var(--ease-standard), -webkit-backdrop-filter 500ms var(--ease-standard), border-color 500ms var(--ease-standard), box-shadow 500ms var(--ease-standard)",
  };

  return (
    <nav
      aria-label="Main"
      aria-hidden={hasActionBar || undefined}
      inert={hasActionBar || undefined}
      className={cn(
        "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 lg:hidden",
        hasActionBar && "invisible",
      )}
    >
      <div
        style={glassStyle}
        className="flex h-16 items-center gap-1 rounded-full border p-1.5 shadow-[0_14px_34px_rgb(var(--shadow-color)/0.16),0_2px_6px_rgb(var(--shadow-color)/0.08)]"
      >
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const active = key === current;
          const content = (
            <>
              <span className="relative shrink-0">
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                {key === "saved" && savedCount > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "ring-bg absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums ring-2",
                      active ? "bg-bg text-accent" : "bg-accent text-accent-foreground",
                    )}
                  >
                    {savedCount > 9 ? "9+" : savedCount}
                  </span>
                )}
              </span>
              {/* Only the active tab shows its name; it fades in on mount rather than animating its width. */}
              <span className={cn("whitespace-nowrap", active ? "tab-label-in" : "sr-only")}>{label}</span>
            </>
          );
          const cls = cn(
            ITEM,
            active
              ? "bg-accent/90 text-accent-foreground grow-[2.4] px-3"
              : "text-white grow active:bg-white/15",
          );

          return href ? (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={key === "saved" && savedCount > 0 ? `Saved, ${savedCount} properties` : label}
              onClick={() => setTapped({ key, from: pathname })}
              className={cls}
            >
              {content}
            </Link>
          ) : (
            <button key={key} type="button" onClick={openMenu} aria-haspopup="dialog" aria-label={label} className={cls}>
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

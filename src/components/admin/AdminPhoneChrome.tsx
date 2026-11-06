"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Building2, ChevronRight, LayoutDashboard, LayoutGrid, LogOut, Search, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/navigation/Logo";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { QUICK_ACTIONS } from "@/components/admin/search/GlobalSearch";
import { ADMIN_NAV_GROUPS } from "@/config/navigation";
import { ROLE_LABELS } from "@/config/roles";
import { hasPermission } from "@/lib/permissions";
import { logoutAction } from "@/lib/auth/actions";
import { runAdminSearch } from "@/features/search/actions";
import type { SearchResult } from "@/features/search";
import type { Permission } from "@/config/permissions";
import type { CompanySettings } from "@/types/settings";
import type { User } from "@/types/user";

export interface AdminPhoneChromeProps {
  user: User;
  incompleteHrefs: string[];
  settings: CompanySettings | null;
}

interface Tab {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Which pages keep this tab lit. The first tab that matches wins, so list narrower ones first. */
  match: (path: string) => boolean;
}

const startsWithAny = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(p + "/"));

const TABS: Tab[] = [
  { label: "Home", href: "/admin", icon: LayoutDashboard, match: (p) => p === "/admin" },
  {
    label: "Clients",
    href: "/admin/customers",
    icon: Users,
    permission: "customer.view",
    match: (p) => startsWithAny(p, ["/admin/customers", "/admin/shareholders", "/admin/landowners", "/admin/leads", "/admin/sales/bookings"]),
  },
  {
    label: "Money",
    href: "/admin/sales/payments",
    icon: Wallet,
    permission: "finance.view",
    match: (p) => startsWithAny(p, ["/admin/sales", "/admin/finance", "/admin/statements"]),
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: Building2,
    permission: "project.view",
    match: (p) => startsWithAny(p, ["/admin/projects", "/admin/properties", "/admin/parking", "/admin/construction", "/admin/procurement"]),
  },
];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/** The nav item whose address best matches the page you are on (longest wins), used for the top bar's title. */
function titleFor(pathname: string): string {
  let best: { label: string; len: number } | null = null;
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.comingSoon) continue;
      const hit = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
      if (hit && (!best || item.href.length > best.len)) best = { label: item.label, len: item.href.length };
    }
  }
  return best?.label ?? "Admin";
}

/**
 * The phone version of the admin chrome (below `lg`): a slim solid top bar,
 * a floating bottom tab capsule for the four jobs done most often, and a
 * "Menu" sheet holding everything else. Same visual language as the owner
 * portal's phone shell so the two halves of the product feel like one app.
 * The desktop sidebar + header are untouched and only render from `lg` up.
 */
export function AdminPhoneChrome({ user, incompleteHrefs, settings }: AdminPhoneChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Optimistic highlight: the capsule moves the instant a tab is tapped, not after the next page has loaded.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
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

  // Stable callbacks: BottomSheet re-runs its scroll-lock/focus effect whenever `onClose` changes identity.
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const goTo = useCallback(
    (href: string) => {
      setSearchOpen(false);
      router.push(href);
    },
    [router],
  );

  const tabs = TABS.filter((t) => !t.permission || hasPermission(user.role, t.permission));
  const currentTab = tabs.find((t) => t.match(pathname))?.href;
  const litTab = pending ?? currentTab;
  const incomplete = useMemo(() => new Set(incompleteHrefs), [incompleteHrefs]);
  const hasAlerts = hasPermission(user.role, "alerts.view");

  return (
    <div className="print:hidden lg:hidden">
      {/* Top bar — fixed (never sticky), solid; a soft shadow fades in once content scrolls under it. */}
      <header
        className={cn(
          "bg-bg fixed inset-x-0 top-0 z-30 flex h-[calc(4.25rem+env(safe-area-inset-top))] items-center gap-3 px-[var(--gutter)] pt-[env(safe-area-inset-top)] transition-shadow duration-300",
          scrolled && "shadow-[0_10px_24px_-10px_rgb(var(--shadow-color)/0.16)]",
        )}
      >
        <Logo src={settings?.logo} mode={settings?.logoMode} displayName={settings?.displayName} className="h-10 sm:h-10" />
        <span aria-hidden className="bg-border-strong h-7 w-px shrink-0" />
        <p className="font-serif-display text-fg min-w-0 flex-1 truncate text-[1.375rem] leading-[1.05]">{titleFor(pathname)}</p>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="bg-surface text-fg active:bg-border flex size-10 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-150 active:scale-90"
        >
          <Search aria-hidden className="size-[18px]" />
        </button>
        {hasAlerts && (
          <Link
            href="/admin/alerts"
            aria-label="Alerts"
            className="bg-surface text-fg active:bg-border flex size-10 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-150 active:scale-90"
          >
            <Bell aria-hidden className="size-[18px]" />
          </Link>
        )}
      </header>

      {/* Bottom navigation — floating capsule; the current tab grows into a green pill showing its name. */}
      <nav aria-label="Admin" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30">
        <div className="bg-bg border-border flex h-16 items-center gap-1 rounded-full border p-1.5 shadow-[0_14px_34px_rgb(var(--shadow-color)/0.16),0_2px_6px_rgb(var(--shadow-color)/0.08)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = litTab === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                onClick={() => setTapped({ href: tab.href, from: pathname })}
                className={cn(
                  "relative flex h-12 min-w-0 touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold [-webkit-tap-highlight-color:transparent] transition-[flex-grow,background-color,color] duration-200 ease-[var(--ease-standard)]",
                  active ? "bg-accent text-accent-foreground grow-[2.4] px-3" : "text-fg-muted grow active:bg-surface",
                )}
              >
                <Icon aria-hidden className="size-[22px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span className={cn("whitespace-nowrap", active ? "tab-label-in" : "sr-only")}>{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="Menu"
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
            className="text-fg-muted active:bg-surface relative flex h-12 min-w-0 grow touch-manipulation items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent]"
          >
            <LayoutGrid aria-hidden className="size-[22px]" strokeWidth={1.75} />
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </nav>

      <MenuSheet open={menuOpen} onClose={closeMenu} user={user} incomplete={incomplete} pathname={pathname} />
      <SearchSheet open={searchOpen} onClose={closeSearch} user={user} onGo={goTo} />
    </div>
  );
}

function MenuSheet({
  open,
  onClose,
  user,
  incomplete,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  incomplete: Set<string>;
  pathname: string;
}) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();

  const groups = useMemo(
    () =>
      ADMIN_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.comingSoon &&
            (!item.permission || hasPermission(user.role, item.permission)) &&
            (!q || item.label.toLowerCase().includes(q) || group.label.toLowerCase().includes(q)),
        ),
      })).filter((group) => group.items.length > 0),
    [user.role, q],
  );

  // The page you are on, including its sub-pages — longest address wins so "/admin" never lights up for everything.
  const activeHref = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
    .filter((i) => !i.comingSoon && (pathname === i.href || (i.href !== "/admin" && pathname.startsWith(i.href + "/"))))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <BottomSheet open={open} onClose={onClose} title="Menu">
      <div className="relative mb-4">
        <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2" />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a page"
          aria-label="Find a page"
          className="bg-surface text-fg placeholder:text-fg-subtle h-12 w-full rounded-full border border-transparent pr-4 pl-11 outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="text-label text-fg-subtle mb-2 px-1 uppercase">{group.label}</h3>
            <ul className="bg-surface-raised border-border divide-border divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === activeHref;
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 items-center gap-3.5 px-4 py-2.5 transition-colors active:bg-surface",
                        active && "bg-accent-soft/60",
                      )}
                    >
                      <span
                        className={cn(
                          "relative flex size-9 shrink-0 items-center justify-center rounded-full",
                          active ? "bg-accent text-accent-foreground" : "bg-surface text-fg-muted",
                        )}
                      >
                        {Icon && <Icon aria-hidden className="size-[18px]" />}
                        {incomplete.has(item.href) && (
                          <span aria-hidden className="bg-warning border-surface-raised absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2" />
                        )}
                      </span>
                      <span className={cn("text-body min-w-0 flex-1 truncate", active && "font-semibold")}>{item.label}</span>
                      <ChevronRight aria-hidden className="text-fg-subtle size-4 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="text-body-sm text-fg-muted py-6 text-center">Nothing matches “{filter}”.</p>}
      </div>

      <div className="border-border mt-6 flex items-center gap-3 border-t pt-4">
        <span className="bg-accent text-accent-foreground text-label flex size-11 shrink-0 items-center justify-center rounded-full">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body truncate font-semibold">{user.name}</p>
          <p className="text-caption text-fg-subtle">{ROLE_LABELS[user.role]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="border-border-strong text-fg active:bg-surface flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}

function SearchSheet({
  open,
  onClose,
  user,
  onGo,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  onGo: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestIdRef = useRef(0);

  // The sheet focuses its own close button first; hand the keyboard to the search box once it has slid in.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [open]);

  // Every way out of the sheet clears it, so it always opens fresh.
  const handleClose = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
    setQuery("");
    setResults([]);
    onClose();
  }, [onClose]);

  function handleGo(href: string) {
    handleClose();
    onGo(href);
  }

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
    setResults([]);
    if (value.trim().length < 2) return;
    const requestId = requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await runAdminSearch(value);
        if (requestIdRef.current === requestId) setResults(found);
      });
    }, 250);
  }

  const quickActions = QUICK_ACTIONS.filter((a) => !a.permission || hasPermission(user.role, a.permission));
  const searching = query.trim().length >= 2;

  return (
    <BottomSheet open={open} onClose={handleClose} title="Search">
      <div className="relative mb-4">
        <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Projects, units, owners, leads…"
          aria-label="Search"
          className="bg-surface text-fg placeholder:text-fg-subtle h-12 w-full rounded-full border border-transparent pr-4 pl-11 outline-none focus:border-accent"
        />
      </div>

      {searching ? (
        <ul className="bg-surface-raised border-border divide-border divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
          {isPending && results.length === 0 ? (
            <li className="text-body-sm text-fg-subtle px-4 py-4">Searching…</li>
          ) : results.length === 0 ? (
            <li className="text-body-sm text-fg-subtle px-4 py-4">No matches for “{query}”.</li>
          ) : (
            results.map((r) => (
              <li key={`${r.type}:${r.id}`}>
                <button type="button" onClick={() => handleGo(r.href)} className="active:bg-surface flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="text-body block truncate font-medium">{r.title}</span>
                    <span className="text-caption text-fg-subtle block truncate">{r.subtitle}</span>
                  </span>
                  <ChevronRight aria-hidden className="text-fg-subtle size-4 shrink-0" />
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        quickActions.length > 0 && (
          <section>
            <h3 className="text-label text-fg-subtle mb-2 px-1 uppercase">Quick actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.href}
                    type="button"
                    onClick={() => handleGo(a.href)}
                    className="bg-surface-raised border-border active:bg-surface flex min-h-14 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left"
                  >
                    <span className="bg-accent-soft text-accent flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon aria-hidden className="size-[18px]" />
                    </span>
                    <span className="text-body-sm min-w-0 font-medium">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )
      )}
    </BottomSheet>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { Tooltip } from "@/components/ui/Tooltip";
import type { NavGroup } from "@/config/navigation";
import type { RoleName } from "@/config/roles";

export interface AdminSidebarNavProps {
  groups: NavGroup[];
  role: RoleName;
  /** Icon-only rail — group labels hidden, item labels shown in a tooltip instead. Desktop only; the mobile drawer never collapses. */
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Hrefs to show a small red "you haven't filled this in yet" dot on — see `src/lib/adminCompleteness.ts`. */
  incompleteHrefs?: string[];
}

/**
 * The actual nav list, shared between the persistent desktop sidebar and
 * the mobile drawer so the two can never drift out of sync. `comingSoon`
 * items render as an inert row (no `<a>`, no href) with a small "Soon"
 * marker — the future information architecture is visible without ever
 * being a broken/dead link.
 */
export function AdminSidebarNav({ groups, role, collapsed, onNavigate, incompleteHrefs }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const incompleteSet = new Set(incompleteHrefs);
  const navRef = useRef<HTMLElement>(null);

  // The item for the page you are on, including its sub-pages (a budget's own page keeps "Budgets & cost splits" lit). The longest matching address wins, so "/admin/sales/payments" is chosen over "/admin/sales" and "/admin" never lights up for everything.
  const activeHref = groups
    .flatMap((g) => g.items)
    .filter((item) => !item.comingSoon && (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"))))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Keep the highlighted item visible when the menu is longer than the screen.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>("a[aria-current=page]")?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label="Admin" className="flex flex-col gap-6">
      {groups.map((group) => {
        const visibleItems = group.items.filter((item) => !item.permission || hasPermission(role, item.permission));
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-label text-fg-subtle/70 mb-1.5 px-3 uppercase">{group.label}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === activeHref;
                const incomplete = !item.comingSoon && incompleteSet.has(item.href);

                const row = (
                  <span
                    className={cn(
                      "flex items-center gap-3 py-2 pr-3 pl-[calc(0.75rem-2px)] transition-colors",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    {Icon && (
                      <span className="relative shrink-0">
                        <Icon aria-hidden className={cn("size-4.5", active && "text-accent-foreground")} />
                        {incomplete && (
                          <span
                            aria-hidden
                            className="bg-error border-surface absolute -top-0.5 -right-0.5 size-2 rounded-full border"
                          />
                        )}
                      </span>
                    )}
                    {!collapsed && (
                      <span className={cn("text-nav flex-1 truncate", active && "font-semibold")}>{item.label}</span>
                    )}
                    {!collapsed && incomplete && (
                      <span
                        aria-label="Missing information"
                        title="Missing information"
                        className="bg-error size-1.5 shrink-0 rounded-full"
                      />
                    )}
                    {!collapsed && item.comingSoon && (
                      <span className="text-caption text-fg-subtle bg-surface shrink-0 rounded px-1.5 py-0.5">
                        Soon
                      </span>
                    )}
                  </span>
                );

                if (item.comingSoon) {
                  const disabledRow = (
                    <div aria-disabled="true" className="text-fg-subtle/60 cursor-not-allowed rounded-r-md border-l-2 border-transparent">
                      {row}
                    </div>
                  );
                  return (
                    <li key={item.label}>
                      {collapsed ? (
                        <Tooltip label={`${item.label} — coming soon`} side="right">
                          {disabledRow}
                        </Tooltip>
                      ) : (
                        disabledRow
                      )}
                    </li>
                  );
                }

                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-r-md border-l-2 transition-colors",
                      active
                        ? "border-accent-strong bg-accent text-accent-foreground shadow-sm"
                        : "text-fg-muted hover:bg-surface hover:text-fg border-transparent",
                    )}
                  >
                    {row}
                  </Link>
                );

                return (
                  <li key={item.label}>
                    {collapsed ? (
                      <Tooltip label={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

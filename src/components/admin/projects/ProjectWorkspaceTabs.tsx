"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { RoleName } from "@/config/roles";
import type { Permission } from "@/config/permissions";
import { cn } from "@/lib/utils";

interface Tab {
  segment: string;
  label: string;
  permission?: Permission;
}

const TABS: Tab[] = [
  { segment: "", label: "Dashboard" },
  { segment: "units", label: "Units", permission: "unit.view" },
  { segment: "owners", label: "Owners" },
  { segment: "distribute", label: "Distribute", permission: "unit.view" },
  { segment: "parking", label: "Parking" },
  { segment: "construction", label: "Construction", permission: "construction.view" },
  { segment: "payments", label: "Payments", permission: "finance.view" },
  { segment: "materials", label: "Materials", permission: "procurement.view" },
  { segment: "expenses", label: "Expenses", permission: "finance.view" },
  { segment: "documents", label: "Documents", permission: "documents.view" },
  { segment: "reports", label: "Reports", permission: "reports.view" },
  { segment: "settings", label: "Settings", permission: "project.update" },
];

export interface ProjectWorkspaceTabsProps {
  projectId: string;
  role: RoleName;
}

/** Plain underlined tab row — this codebase has no tab primitive yet; matches the visual weight of the filter bars `AdminPageHeader`'s children slot already hosts elsewhere. */
export function ProjectWorkspaceTabs({ projectId, role }: ProjectWorkspaceTabsProps) {
  const pathname = usePathname();
  const base = `/admin/projects/${projectId}`;
  const visibleTabs = TABS.filter((tab) => !tab.permission || hasPermission(role, tab.permission));

  return (
    <nav aria-label="Project sections" className="border-border -mb-px flex gap-5 overflow-x-auto scrollbar-none border-b">
      {visibleTabs.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        // "settings" redirects straight to "edit" — treat that as still-active so the tab strip doesn't go blank on landing.
        const isActive = tab.segment
          ? pathname.startsWith(href) || (tab.segment === "settings" && pathname === `${base}/edit`)
          : pathname === base;
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "text-body-sm shrink-0 border-b-2 px-0.5 pb-2.5 transition-colors",
              isActive ? "border-accent text-fg font-medium" : "border-transparent text-fg-subtle hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

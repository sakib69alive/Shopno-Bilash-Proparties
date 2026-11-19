"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { deleteProject } from "@/features/projects/actions";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/project";
import type { ProjectWorkspaceStats } from "@/features/projects/workspaceStats";

export interface ProjectsAdminExplorerProps {
  projects: Project[];
  /** Keyed by project id — computed server-side via `getProjectWorkspaceStats`, the same helper the workspace Dashboard tab uses. */
  stats: Record<string, ProjectWorkspaceStats>;
  canCreate: boolean;
  canDelete: boolean;
}

type StatusGroup = "all" | "active" | "upcoming" | "completed" | "archived";

const STATUS_GROUPS: Record<Exclude<StatusGroup, "all">, ProjectStatus[]> = {
  active: ["ongoing", "ready"],
  upcoming: ["upcoming", "planning"],
  completed: ["completed"],
  archived: ["suspended", "cancelled"],
};

const STATUS_GROUP_OPTIONS: { value: StatusGroup; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

/**
 * Search/filter operate on the real (currently empty) project list from
 * `projectRepository` — client-side, since the whole list is already on
 * the page and there's no pagination yet to make server-side filtering
 * worth the extra round trip. Nothing here is a fake/AI search: it's a
 * plain substring match over name/city/area/address (brief §7).
 */
export function ProjectsAdminExplorer({ projects, stats, canCreate, canDelete }: ProjectsAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [statusGroup, setStatusGroup] = useState<StatusGroup>("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteProject(project.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesStatus = statusGroup === "all" || STATUS_GROUPS[statusGroup].includes(p.status);
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        (p.area?.toLowerCase().includes(query) ?? false) ||
        p.address.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [projects, search, statusGroup]);

  const columns: DataTableColumn<Project>[] = [
    {
      key: "name",
      header: "Project",
      render: (p) => (
        <Link href={`/admin/projects/${p.id}`} className="text-fg hover:text-accent transition-colors">
          {p.name}
        </Link>
      ),
    },
    { key: "location", header: "Location", render: (p) => `${p.city}` },
    { key: "type", header: "Type", render: (p) => p.propertyType },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "units", header: "Units", align: "right", render: (p) => stats[p.id]?.unitTotal ?? 0 },
    {
      key: "progress",
      header: "Construction",
      align: "right",
      render: (p) => {
        const progress = stats[p.id]?.averageConstructionProgress;
        return progress === null || progress === undefined ? <span className="text-fg-subtle">—</span> : `${progress}%`;
      },
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (p) => formatDate(new Date(p.updatedAt)),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/projects/${p.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${p.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${p.name}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(p)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Projects will appear here once your team starts adding them."
        action={
          canCreate && (
            <Link href="/admin/projects/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Project"}</AdminText>
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or location"
            aria-label="Search projects"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={statusGroup}
          onChange={(e) => setStatusGroup(e.target.value as StatusGroup)}
          aria-label={adminCopy("Filter by status")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {STATUS_GROUP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(p) => p.id}
        emptyTitle="No projects match your search"
        emptyDescription="Try a different name, city, or status filter."
      />
    </div>
  );
}

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
import { deletePhase } from "@/features/construction/phaseActions";
import { deriveScheduleDelay } from "@/lib/constructionProgress";
import { ProgressBar } from "@/components/admin/construction/ProgressBar";
import { cn } from "@/lib/utils";
import type { ConstructionPhase, ConstructionStatus } from "@/types/construction";
import type { Project } from "@/types/project";
import type { Contractor } from "@/types/contractor";

export interface ConstructionAdminExplorerProps {
  phases: ConstructionPhase[];
  projects: Project[];
  contractors: Contractor[];
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

const STATUS_OPTIONS: { value: ConstructionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "not-started", label: "Not Started" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Search/filter over the real (currently empty) phase list from
 * `constructionPhaseRepository`, joined client-side to the projects already
 * fetched by the page (Admin Step 5's `projectRepository`) — no second
 * project dataset, same pattern as Admin Step 6's Properties explorer.
 */
export function ConstructionAdminExplorer({ phases, projects, contractors, canCreate, canDelete, initialProjectId }: ConstructionAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ConstructionStatus | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [contractorId, setContractorId] = useState<string | "all">("all");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(phase: ConstructionPhase) {
    if (!window.confirm(`Delete phase "${phase.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deletePhase(phase.id);
      if (result.error) window.alert(result.error);
    });
  }

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const contractorsById = useMemo(() => new Map(contractors.map((c) => [c.id, c])), [contractors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return phases
      .filter((phase) => {
        const project = projectsById.get(phase.projectId);
        const matchesStatus = status === "all" || phase.status === status;
        const matchesProject = projectId === "all" || phase.projectId === projectId;
        const matchesContractor = contractorId === "all" || phase.contractorId === contractorId;
        const matchesDelayed = !delayedOnly || deriveScheduleDelay(phase.endDate, phase.actualEndDate, phase.status).isDelayed;
        const matchesSearch =
          !query ||
          phase.name.toLowerCase().includes(query) ||
          (project?.name.toLowerCase().includes(query) ?? false);
        return matchesStatus && matchesProject && matchesContractor && matchesDelayed && matchesSearch;
      })
      .sort((a, b) => a.order - b.order);
  }, [phases, projectsById, search, status, projectId, contractorId, delayedOnly]);

  const columns: DataTableColumn<ConstructionPhase>[] = [
    {
      key: "name",
      header: "Phase",
      render: (p) => (
        <Link href={`/admin/construction/${p.id}`} className="text-fg hover:text-accent transition-colors">
          {p.name}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (p) => {
        const project = projectsById.get(p.projectId);
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "order", header: "Order", render: (p) => String(p.order), align: "right" },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "progress", header: "Progress", render: (p) => <ProgressBar value={p.progressPercentage} className="min-w-32" /> },
    {
      key: "endDate",
      header: "Target End",
      render: (p) => {
        const delay = deriveScheduleDelay(p.endDate, p.actualEndDate, p.status);
        return (
          <span className="flex items-center gap-1.5">
            {p.endDate ? formatDate(new Date(p.endDate)) : "—"}
            {delay.isDelayed && <span className="text-caption text-error">+{delay.daysDelayed}d</span>}
          </span>
        );
      },
    },
    { key: "contractor", header: "Contractor", render: (p) => (p.contractorId ? contractorsById.get(p.contractorId)?.name : p.contractorName) ?? "—" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/construction/${p.id}/edit`}>
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

  if (phases.length === 0) {
    return (
      <EmptyState
        title="No construction phases yet"
        description="Phases will appear here once your team starts adding them to a project."
        action={
          canCreate && (
            <Link href="/admin/construction/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Phase"}</AdminText>
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
            placeholder="Search by phase or project"
            aria-label="Search construction phases"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label={adminCopy("Filter by project")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="all"><AdminText>{"All projects"}</AdminText></option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ConstructionStatus | "all")}
          aria-label={adminCopy("Filter by status")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          aria-label={adminCopy("Filter by contractor")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="all"><AdminText>{"All contractors"}</AdminText></option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="text-body-sm text-fg-muted flex h-10 items-center gap-2 px-1">
          <input type="checkbox" checked={delayedOnly} onChange={(e) => setDelayedOnly(e.target.checked)} />
          <AdminText>{"Delayed only"}</AdminText>
        </label>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(p) => p.id}
        emptyTitle="No phases match your search"
        emptyDescription="Try a different phase, project, or status filter."
      />
    </div>
  );
}

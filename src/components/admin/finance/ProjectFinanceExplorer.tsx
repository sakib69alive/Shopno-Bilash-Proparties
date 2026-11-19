"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExplainFinanceButton, setFinanceAssistantProject } from "./FinanceAssistant";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatBDT, formatDate } from "@/lib/format";
import { deleteProjectBudget } from "@/features/finance/projectBudgetActions";
import type { ProjectBudget } from "@/types/finance/project";
import type { Project } from "@/types/project";

export interface ProjectFinanceExplorerProps {
  budgets: ProjectBudget[];
  projects: Project[];
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

/**
 * Search/filter over the budget list from `projectBudgetRepository`,
 * joined client-side to the projects already fetched by the page — no
 * second project dataset. Variance (actual − budgeted) is computed here
 * for display only, never stored.
 */
export function ProjectFinanceExplorer({ budgets, projects, canCreate, canDelete, initialProjectId }: ProjectFinanceExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(budget: ProjectBudget) {
    if (!window.confirm(`Delete the "${budget.category}" budget line? This can't be undone.`)) return;
    startTransition(() => {
      deleteProjectBudget(budget.id);
    });
  }

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return budgets
      .filter((budget) => {
        const matchesProject = projectId === "all" || budget.projectId === projectId;
        const matchesSearch = !query || budget.category.toLowerCase().includes(query);
        return matchesProject && matchesSearch;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [budgets, search, projectId]);

  const columns: DataTableColumn<ProjectBudget>[] = [
    {
      key: "category",
      header: "Category",
      render: (b) => (
        <Link href={`/admin/finance/project-costs/${b.id}`} className="text-fg hover:text-accent transition-colors">
          {b.category}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (b) => {
        const project = projectsById.get(b.projectId);
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "budgeted", header: "Budgeted", render: (b) => formatBDT(b.budgeted.amount), align: "right" },
    { key: "actual", header: "Actual (Manual)", render: (b) => formatBDT(b.actual.amount), align: "right" },
    {
      key: "variance",
      header: "Variance",
      align: "right",
      render: (b) => {
        const variance = b.actual.amount - b.budgeted.amount;
        const over = variance > 0;
        return (
          <span className={over ? "text-error" : "text-success"}>
            {over ? "+" : ""}
            {formatBDT(variance)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (b) => {
        const utilizationPct = b.budgeted.amount > 0 ? (100 * b.actual.amount) / b.budgeted.amount : 0;
        const warningThresholdPct = b.warningThresholdPct ?? 80;
        const overThresholdPct = b.overThresholdPct ?? 100;
        const status = utilizationPct >= overThresholdPct ? "over" : utilizationPct >= warningThresholdPct ? "on" : "under";
        const label = status === "over" ? "Over Budget" : status === "on" ? "On Budget" : "Under Budget";
        const tone = status === "over" ? "bg-error-soft text-error" : status === "on" ? "bg-warning-soft text-warning" : "bg-success-soft text-success";
        return <span className={`text-caption rounded-full px-2 py-0.5 ${tone}`}>{label}</span>;
      },
    },
    { key: "date", header: "Date", render: (b) => formatDate(new Date(b.date)) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <span className="flex items-center justify-end gap-1">
          <ExplainFinanceButton selection={{ kind: "budget", id: b.id }} />
          <Link href={`/admin/finance/project-costs/${b.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${b.category}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${b.category}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(b)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (budgets.length === 0) {
    return (
      <EmptyState
        title="No project budgets yet"
        description="Budget lines will appear here once your team records one."
        action={
          canCreate && (
            <Link href="/admin/finance/project-costs/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Budget Line"}</AdminText>
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
            placeholder="Search by category"
            aria-label="Search project budgets"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setFinanceAssistantProject(e.target.value); }}
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
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(b) => b.id}
        emptyTitle="No budgets match your search"
        emptyDescription="Try a different category or project filter."
      />
    </div>
  );
}

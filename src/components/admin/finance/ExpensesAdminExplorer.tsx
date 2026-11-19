"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import { deleteExpense } from "@/features/finance/expenseActions";
import { cn } from "@/lib/utils";
import type { ProjectExpense } from "@/types/finance/project";
import type { Project } from "@/types/project";
import { ExplainFinanceButton, setFinanceAssistantProject } from "./FinanceAssistant";

export interface ExpensesAdminExplorerProps {
  expenses: ProjectExpense[];
  projects: Project[];
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

/**
 * Search/filter over the real (currently empty) expense list from
 * `projectExpenseRepository`, joined client-side to the projects already
 * fetched by the page — no second project dataset.
 */
export function ExpensesAdminExplorer({ expenses, projects, canCreate, canDelete, initialProjectId }: ExpensesAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(expense: ProjectExpense) {
    if (!window.confirm(`Delete "${expense.description}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteExpense(expense.id);
    });
  }

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses
      .filter((expense) => {
        const matchesProject = projectId === "all" || expense.projectId === projectId;
        const matchesSearch =
          !query ||
          expense.description.toLowerCase().includes(query) ||
          expense.category.toLowerCase().includes(query);
        return matchesProject && matchesSearch;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, search, projectId]);

  const columns: DataTableColumn<ProjectExpense>[] = [
    {
      key: "description",
      header: "Description",
      render: (e) => (
        <Link href={`/admin/finance/expenses/${e.id}`} className="text-fg hover:text-accent transition-colors">
          {e.description}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (e) => {
        const project = projectsById.get(e.projectId);
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "category", header: "Category", render: (e) => e.category },
    { key: "amount", header: "Amount", render: (e) => formatBDT(e.amount.amount), align: "right" },
    { key: "date", header: "Date", render: (e) => formatDate(new Date(e.date)) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <span className="flex items-center justify-end gap-1">
          <ExplainFinanceButton selection={{ kind: "expense", id: e.id }} />
          <Link href={`/admin/finance/expenses/${e.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${e.description}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${e.description}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(e)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Expenses will appear here once your team records one."
        action={
          canCreate && (
            <Link href="/admin/finance/expenses/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Expense"}</AdminText>
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
            placeholder="Search by description or category"
            aria-label="Search expenses"
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
        getRowId={(e) => e.id}
        emptyTitle="No expenses match your search"
        emptyDescription="Try a different description, category, or project filter."
      />
    </div>
  );
}

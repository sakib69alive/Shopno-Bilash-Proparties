"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatBDT, formatDate } from "@/lib/format";
import type { CostAllocation } from "@/types/finance/costAllocation";
import type { Project } from "@/types/project";
import { ExplainFinanceButton } from "./FinanceAssistant";

export interface CostAllocationExplorerProps {
  allocations: CostAllocation[];
  projects: Project[];
  canCreate: boolean;
}

export function CostAllocationExplorer({ allocations, projects, canCreate }: CostAllocationExplorerProps) {
  const [search, setSearch] = useState("");
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allocations
      .filter((a) => !query || a.title.toLowerCase().includes(query) || a.category.toLowerCase().includes(query))
      .sort((a, b) => b.allocationDate.localeCompare(a.allocationDate));
  }, [allocations, search]);

  const columns: DataTableColumn<CostAllocation>[] = [
    {
      key: "title",
      header: "Title",
      render: (a) => (
        <Link href={`/admin/finance/cost-allocations/${a.id}`} className="text-fg hover:text-accent transition-colors">
          {a.title}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (a) => {
        const project = projectsById.get(a.projectId);
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "category", header: "Category", render: (a) => a.category },
    { key: "totalAmount", header: "Total Amount", align: "right", render: (a) => formatBDT(a.totalAmount.amount) },
    { key: "dueDate", header: "Due Date", render: (a) => formatDate(new Date(a.dueDate)) },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    { key: "explain", header: "", align: "right", render: (a) => <ExplainFinanceButton selection={{ kind: "goal", id: a.id }} /> },
  ];

  if (allocations.length === 0) {
    return (
      <EmptyState
        title="No cost allocations yet"
        description="Split a shared construction cost (like piling) across every unit owner, by unit size."
        action={
          canCreate && (
            <Link href="/admin/finance/cost-allocations/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Allocation"}</AdminText>
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or category"
          aria-label="Search cost allocations"
          className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(a) => a.id}
        emptyTitle="No allocations match your search"
        emptyDescription="Try a different title or category."
      />
    </div>
  );
}

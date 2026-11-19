"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import { deleteSale } from "@/features/sales/actions";
import { cn } from "@/lib/utils";
import type { Sale } from "@/types/sales";
import type { Unit } from "@/types/unit";
import type { Customer } from "@/types/customer";
import type { Project } from "@/types/project";

export interface SalesAdminExplorerProps {
  sales: Sale[];
  units: Unit[];
  customers: Customer[];
  projects: Project[];
  canCreate: boolean;
  canDelete: boolean;
}

/**
 * Search/filter over the real (currently empty) sale list from
 * `saleRepository`, joined client-side to the units/customers/projects
 * already fetched by the page — no second unit, customer, or project
 * dataset, same reuse pattern as every earlier admin explorer.
 */
export function SalesAdminExplorer({ sales, units, customers, projects, canCreate, canDelete }: SalesAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(sale: Sale) {
    if (!window.confirm("Delete this sale? The unit will become available again. This can't be undone.")) return;
    startTransition(() => {
      deleteSale(sale.id);
    });
  }

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const customersById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sales
      .filter((sale) => {
        const unit = unitsById.get(sale.unitId);
        const customer = customersById.get(sale.customerId);
        const matchesProject = projectId === "all" || unit?.projectId === projectId;
        const matchesSearch =
          !query ||
          (unit?.unitNumber.toLowerCase().includes(query) ?? false) ||
          (customer?.name.toLowerCase().includes(query) ?? false);
        return matchesProject && matchesSearch;
      })
      .sort((a, b) => b.saleDate.localeCompare(a.saleDate));
  }, [sales, unitsById, customersById, search, projectId]);

  const columns: DataTableColumn<Sale>[] = [
    {
      key: "unit",
      header: "Unit",
      render: (s) => {
        const unit = unitsById.get(s.unitId);
        return unit ? (
          <Link href={`/admin/properties/${unit.id}`} className="text-fg hover:text-accent transition-colors">
            {unit.unitNumber}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    {
      key: "project",
      header: "Project",
      render: (s) => {
        const unit = unitsById.get(s.unitId);
        const project = unit ? projectsById.get(unit.projectId) : undefined;
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (s) => {
        const customer = customersById.get(s.customerId);
        return customer ? (
          <Link href={`/admin/customers/${customer.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {customer.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "saleDate", header: "Sale Date", render: (s) => formatDate(new Date(s.saleDate)) },
    { key: "salePrice", header: "Sale Price", render: (s) => formatBDT(s.salePrice.amount), align: "right" },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (s) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/sales/${s.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit sale ${s.id}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete sale ${s.id}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(s)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (sales.length === 0) {
    return (
      <EmptyState
        title="No sales yet"
        description="Sales will appear here once your team records one."
        action={
          canCreate && (
            <Link href="/admin/sales/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Sale"}</AdminText>
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
            placeholder="Search by unit or customer"
            aria-label="Search sales"
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
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(s) => s.id}
        emptyTitle="No sales match your search"
        emptyDescription="Try a different unit, customer, or project filter."
      />
    </div>
  );
}

"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExplainFinanceButton } from "@/components/admin/finance/FinanceAssistant";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import { deleteInstallment } from "@/features/sales/installmentActions";
import { cn } from "@/lib/utils";
import type { Installment, InstallmentStatus } from "@/types/sales";

export interface InstallmentsAdminExplorerProps {
  installments: Installment[];
  canCreate: boolean;
  canDelete: boolean;
  canExplain?: boolean;
}

const STATUS_OPTIONS: { value: InstallmentStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "due-soon", label: "Due Soon" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

/**
 * Search/filter over the real (currently empty) installment list from
 * `installmentRepository` — by contract id or installment number, the
 * only real fields available without a Contract repository to join
 * against.
 */
export function InstallmentsAdminExplorer({ installments, canCreate, canDelete, canExplain }: InstallmentsAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InstallmentStatus | "all">("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(installment: Installment) {
    if (!window.confirm(`Delete installment #${installment.installmentNumber}? This can't be undone.`)) return;
    startTransition(() => {
      deleteInstallment(installment.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return installments
      .filter((i) => {
        const matchesStatus = status === "all" || i.status === status;
        const matchesSearch =
          !query ||
          i.contractId.toLowerCase().includes(query) ||
          String(i.installmentNumber).includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [installments, search, status]);

  const columns: DataTableColumn<Installment>[] = [
    {
      key: "installmentNumber",
      header: "Installment #",
      render: (i) => (
        <Link href={`/admin/sales/installments/${i.id}`} className="text-fg hover:text-accent transition-colors">
          #{i.installmentNumber}
        </Link>
      ),
    },
    { key: "contract", header: "Contract", render: (i) => i.contractId },
    { key: "amount", header: "Amount", render: (i) => formatBDT(i.amount.amount), align: "right" },
    { key: "dueDate", header: "Due Date", render: (i) => formatDate(new Date(i.dueDate)) },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    { key: "paidDate", header: "Paid Date", render: (i) => (i.paidDate ? formatDate(new Date(i.paidDate)) : "—") },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (i) => (
        <span className="flex items-center justify-end gap-1">
          {canExplain && <ExplainFinanceButton selection={{ kind: "installment", id: i.id }} />}
          <Link href={`/admin/sales/installments/${i.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit installment #${i.installmentNumber}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete installment #${i.installmentNumber}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(i)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (installments.length === 0) {
    return (
      <EmptyState
        title="No installments yet"
        description="Installment schedules will appear here once your team records one."
        action={
          canCreate && (
            <Link href="/admin/sales/installments/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Schedule Installment"}</AdminText>
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
            placeholder="Search by contract or installment number"
            aria-label="Search installments"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InstallmentStatus | "all")}
          aria-label={adminCopy("Filter by status")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(i) => i.id}
        emptyTitle="No installments match your search"
        emptyDescription="Try a different contract, installment number, or status filter."
      />
    </div>
  );
}

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
import { formatBDT, formatDate } from "@/lib/format";
import { deletePayment } from "@/features/finance/paymentActions";
import { cn } from "@/lib/utils";
import type { CustomerPayment, PaymentMethod } from "@/types/finance/customer";
import type { Customer } from "@/types/customer";
import type { Project } from "@/types/project";

export interface PaymentsAdminExplorerProps {
  payments: CustomerPayment[];
  customers: Customer[];
  projects: Project[];
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  "bank-transfer": "Bank Transfer",
  cheque: "Cheque",
  "mobile-banking": "Mobile Banking",
  card: "Card",
};

const METHOD_OPTIONS: { value: PaymentMethod | "all"; label: string }[] = [
  { value: "all", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "mobile-banking", label: "Mobile Banking" },
  { value: "card", label: "Card" },
];

/**
 * Search/filter over the real (currently empty) payment list from
 * `customerPaymentRepository`, joined client-side to the customers/
 * projects already fetched by the page — no second dataset of either.
 */
export function PaymentsAdminExplorer({ payments, customers, projects, canCreate, canDelete, initialProjectId }: PaymentsAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(payment: CustomerPayment) {
    if (!window.confirm("Delete this payment? This can't be undone.")) return;
    startTransition(() => {
      deletePayment(payment.id);
    });
  }

  const customersById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments
      .filter((payment) => {
        const customer = customersById.get(payment.customerId);
        const matchesMethod = method === "all" || payment.method === method;
        const matchesProject = projectId === "all" || payment.projectId === projectId;
        const matchesSearch =
          !query ||
          (customer?.name.toLowerCase().includes(query) ?? false) ||
          (payment.receiptNumber?.toLowerCase().includes(query) ?? false);
        return matchesMethod && matchesProject && matchesSearch;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, customersById, search, method, projectId]);

  const columns: DataTableColumn<CustomerPayment>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (p) => {
        const customer = customersById.get(p.customerId);
        return customer ? (
          <Link href={`/admin/customers/${customer.id}`} className="text-fg hover:text-accent transition-colors">
            {customer.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    {
      key: "project",
      header: "Project",
      render: (p) => {
        const project = p.projectId ? projectsById.get(p.projectId) : undefined;
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "amount", header: "Amount", render: (p) => formatBDT(p.amount.amount), align: "right" },
    { key: "method", header: "Method", render: (p) => METHOD_LABEL[p.method] },
    { key: "date", header: "Date", render: (p) => formatDate(new Date(p.date)) },
    { key: "receipt", header: "Receipt #", render: (p) => p.receiptNumber ?? "—" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <span className="flex items-center justify-end gap-1">
          <ExplainFinanceButton selection={{ kind: "payment", id: p.id }} />
          <Link href={`/admin/sales/payments/${p.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit payment ${p.id}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete payment ${p.id}`}
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

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payments yet"
        description="Payments will appear here once your team records one."
        action={
          canCreate && (
            <Link href="/admin/sales/payments/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Payment"}</AdminText>
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
            placeholder="Search by customer or receipt number"
            aria-label="Search payments"
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
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod | "all")}
          aria-label={adminCopy("Filter by payment method")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {METHOD_OPTIONS.map((opt) => (
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
        emptyTitle="No payments match your search"
        emptyDescription="Try a different customer, receipt number, project, or method."
      />
    </div>
  );
}

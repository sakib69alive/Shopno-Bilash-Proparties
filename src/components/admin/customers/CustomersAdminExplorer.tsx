"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2, Plus, Wallet } from "lucide-react";
import { PortalLinkControls } from "@/components/admin/users/PortalLinkControls";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { deleteCustomer } from "@/features/customers/actions";
import { cn } from "@/lib/utils";
import type { Customer, CustomerStatus } from "@/types/customer";

export interface CustomersAdminExplorerProps {
  customers: Customer[];
  /** Customer id → names of the projects they have a sale in. */
  projectsByCustomer?: Record<string, string[]>;
  canCreate: boolean;
  canDelete: boolean;
  /** Shows the "copy login link / send on WhatsApp" buttons on every row. */
  canManagePortalAccess?: boolean;
  /** Shows the "record a payment" shortcut on every row. */
  canRecordPayment?: boolean;
}

const STATUS_OPTIONS: { value: CustomerStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

/**
 * Search/filter over the real (currently empty) customer list from
 * `customerRepository` — plain substring match over name/phone/email
 * (Admin Step 7 §8), never an "AI" search.
 */
export function CustomersAdminExplorer({ customers, projectsByCustomer = {}, canCreate, canDelete, canManagePortalAccess, canRecordPayment }: CustomersAdminExplorerProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(customer: Customer) {
    if (!window.confirm(`Delete "${customer.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteCustomer(customer.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesStatus = status === "all" || c.status === status;
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (projectsByCustomer[c.id] ?? []).some((p) => p.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [customers, projectsByCustomer, search, status]);

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <Link href={`/admin/customers/${c.id}`} className="text-fg hover:text-accent font-medium underline-offset-4 transition-colors hover:underline">
          {c.name}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (c) => (projectsByCustomer[c.id] ?? []).join(", ") || <span className="text-fg-subtle">—</span>,
    },
    { key: "phone", header: "Phone", render: (c) => c.phone },
    { key: "email", header: "Email", render: (c) => c.email },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "updatedAt", header: "Last Updated", render: (c) => formatDate(new Date(c.updatedAt)) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canManagePortalAccess && <PortalLinkControls variant="compact" ownerType="customer" ownerId={c.id} ownerName={c.name} phone={c.phone} />}
          {canRecordPayment && (
            <Link href={`/admin/sales/payments/new?customerId=${c.id}`}>
              <IconButton icon={Wallet} label={`Record a payment from ${c.name}`} size="sm" />
            </Link>
          )}
          <Link href={`/admin/customers/${c.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${c.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${c.name}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(c)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (customers.length === 0) {
    return (
      <EmptyState
        title="No customers yet"
        description="Customers will appear here once your team starts adding them."
        action={
          canCreate && (
            <Link href="/admin/customers/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              New Customer
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
            placeholder="Search by name, phone, email or project"
            aria-label="Search customers"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CustomerStatus | "all")}
          aria-label="Filter by status"
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
        getRowId={(c) => c.id}
        onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
        emptyTitle="No customers match your search"
        emptyDescription="Try a different name, phone, email, or status filter."
      />
    </div>
  );
}

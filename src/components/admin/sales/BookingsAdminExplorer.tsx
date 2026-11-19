"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, ArrowRightLeft, XCircle, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import { cancelBooking, confirmBooking } from "@/features/sales/bookingActions";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/sales";
import type { Unit } from "@/types/unit";
import type { Customer } from "@/types/customer";
import type { Project } from "@/types/project";

export interface BookingsAdminExplorerProps {
  bookings: Booking[];
  units: Unit[];
  customers: Customer[];
  projects: Project[];
  canManage: boolean;
}

const ACTIVE_STATUSES = new Set(["reserved", "booked", "confirmed"]);

export function BookingsAdminExplorer({ bookings, units, customers, projects, canManage }: BookingsAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [isPending, startTransition] = useTransition();

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const customersById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function handleCancel(booking: Booking) {
    const reason = window.prompt("Cancellation reason:");
    if (!reason) return;
    startTransition(() => {
      cancelBooking(booking.id, reason);
    });
  }

  function handleConfirm(booking: Booking) {
    startTransition(() => {
      confirmBooking(booking.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings
      .filter((b) => {
        const unit = unitsById.get(b.unitId);
        const customer = customersById.get(b.customerId);
        const matchesProject = projectId === "all" || b.projectId === projectId;
        const matchesSearch =
          !query || (unit?.unitNumber.toLowerCase().includes(query) ?? false) || (customer?.name.toLowerCase().includes(query) ?? false);
        return matchesProject && matchesSearch;
      })
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  }, [bookings, unitsById, customersById, search, projectId]);

  const columns: DataTableColumn<Booking>[] = [
    {
      key: "unit",
      header: "Unit",
      render: (b) => {
        const unit = unitsById.get(b.unitId);
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
      render: (b) => {
        const project = projectsById.get(b.projectId);
        return project ? <span className="text-fg-muted">{project.name}</span> : <span className="text-fg-subtle">—</span>;
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (b) => {
        const customer = customersById.get(b.customerId);
        return customer ? (
          <Link href={`/admin/customers/${customer.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {customer.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "bookingDate", header: "Booking Date", render: (b) => formatDate(new Date(b.bookingDate)) },
    { key: "agreedPrice", header: "Agreed Price", render: (b) => formatBDT(b.agreedPrice.amount), align: "right" },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) =>
        canManage &&
        ACTIVE_STATUSES.has(b.status) && (
          <span className="flex items-center justify-end gap-1">
            {b.status !== "confirmed" && (
              <IconButton icon={ArrowRightLeft} label="Confirm booking" size="sm" disabled={isPending} onClick={() => handleConfirm(b)} />
            )}
            <Link href={`/admin/sales/new?bookingId=${b.id}`} className="text-caption text-accent hover:underline">
              Convert to Sale
            </Link>
            <IconButton
              icon={XCircle}
              label="Cancel booking"
              size="sm"
              disabled={isPending}
              onClick={() => handleCancel(b)}
              className="hover:text-error"
            />
          </span>
        ),
    },
  ];

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings yet"
        description="Temporary unit reservations will appear here once your team records one."
        action={
          canManage && (
            <Link href="/admin/sales/bookings/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Booking"}</AdminText>
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
            aria-label="Search bookings"
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
        getRowId={(b) => b.id}
        emptyTitle="No bookings match your search"
        emptyDescription="Try a different unit, customer, or project filter."
      />
    </div>
  );
}

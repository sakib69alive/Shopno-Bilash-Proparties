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
import { formatBDT } from "@/lib/format";
import { deletePurchase } from "@/features/procurement/purchaseActions";
import { derivePurchaseReceivingState } from "@/lib/materialStock";
import { cn } from "@/lib/utils";
import type { Purchase, PaymentStatus, Vendor, Material } from "@/types/procurement";
import type { Project } from "@/types/project";

export interface PurchasesAdminExplorerProps {
  purchases: Purchase[];
  vendors: Vendor[];
  projects: Project[];
  materials: Material[];
  /** Total received-so-far per purchase, computed server-side from `PurchaseReceipt` rows. */
  receivedByPurchaseId: Record<string, number>;
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

const STATUS_OPTIONS: { value: PaymentStatus | "all"; label: string }[] = [
  { value: "all", label: "All payment statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially-paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
];

/** Search/filter over the real purchase list from `purchaseRepository`, joined client-side to materials/vendors/projects already fetched by the page. */
export function PurchasesAdminExplorer({
  purchases,
  vendors,
  projects,
  materials,
  receivedByPurchaseId,
  canCreate,
  canDelete,
  initialProjectId,
}: PurchasesAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(purchase: Purchase) {
    if (!window.confirm("Delete this purchase? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deletePurchase(purchase.id);
      if (result.error) window.alert(result.error);
    });
  }

  const vendorsById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchases
      .filter((purchase) => {
        const vendor = vendorsById.get(purchase.vendorId);
        const material = purchase.materialId ? materialsById.get(purchase.materialId) : undefined;
        const matchesStatus = status === "all" || purchase.paymentStatus === status;
        const matchesProject = projectId === "all" || purchase.projectId === projectId;
        const matchesSearch =
          !query ||
          (vendor?.name.toLowerCase().includes(query) ?? false) ||
          (material?.name.toLowerCase().includes(query) ?? false) ||
          (purchase.invoiceNumber?.toLowerCase().includes(query) ?? false) ||
          (purchase.referenceNumber?.toLowerCase().includes(query) ?? false);
        return matchesStatus && matchesProject && matchesSearch;
      })
      .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  }, [purchases, vendorsById, materialsById, search, status, projectId]);

  const columns: DataTableColumn<Purchase>[] = [
    {
      key: "material",
      header: "Material",
      render: (p) => {
        const material = p.materialId ? materialsById.get(p.materialId) : undefined;
        return material ? (
          <Link href={`/admin/procurement/materials/${material.id}`} className="text-fg hover:text-accent font-medium transition-colors">
            {material.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    {
      key: "vendor",
      header: "Supplier",
      render: (p) => {
        const vendor = vendorsById.get(p.vendorId);
        return vendor ? (
          <Link href={`/admin/procurement/${vendor.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {vendor.name}
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
    { key: "quantity", header: "Quantity", render: (p) => (p.quantity !== undefined ? `${p.quantity.toLocaleString()} ${p.unit}` : "—"), align: "right" },
    { key: "unitPrice", header: "Unit Price", render: (p) => (p.unitPrice ? formatBDT(p.unitPrice.amount) : "—"), align: "right" },
    { key: "total", header: "Total", render: (p) => formatBDT(p.total.amount), align: "right" },
    { key: "date", header: "Date", render: (p) => p.purchaseDate ?? "—" },
    { key: "payment", header: "Payment", render: (p) => <StatusBadge status={p.paymentStatus} /> },
    {
      key: "delivery",
      header: "Receiving",
      render: (p) => {
        const state = derivePurchaseReceivingState(p, receivedByPurchaseId[p.id] ?? 0);
        return <StatusBadge status={state.status} />;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/procurement/purchases/${p.id}`}>
            <IconButton icon={Pencil} label={adminCopy("View purchase")} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={adminCopy("Delete purchase")}
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

  if (purchases.length === 0) {
    return (
      <EmptyState
        title="No purchases yet"
        description="A material bought from a supplier and invoiced against a project will appear here."
        action={
          canCreate && (
            <Link href="/admin/procurement/purchases/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Purchase"}</AdminText>
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
            placeholder="Search by material, supplier, or invoice #"
            aria-label="Search purchases"
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
          onChange={(e) => setStatus(e.target.value as PaymentStatus | "all")}
          aria-label="Filter by payment status"
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
        getRowId={(p) => p.id}
        emptyTitle="No purchases match your search"
        emptyDescription="Try a different material, supplier, invoice number, project, or status."
      />
    </div>
  );
}

"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { deleteVendor } from "@/features/procurement/vendorActions";
import { cn } from "@/lib/utils";
import type { Vendor } from "@/types/procurement";

export interface VendorsAdminExplorerProps {
  vendors: Vendor[];
  canCreate: boolean;
  canDelete: boolean;
}

/**
 * Search over the real (currently empty) vendor list from
 * `vendorRepository` — same shape as every other admin explorer.
 */
export function VendorsAdminExplorer({ vendors, canCreate, canDelete }: VendorsAdminExplorerProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete(vendor: Vendor) {
    if (!window.confirm(`Delete "${vendor.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteVendor(vendor.id);
      if (result.error) window.alert(result.error);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vendors
      .filter((v) => {
        if (!query) return true;
        return (
          v.name.toLowerCase().includes(query) ||
          v.phone.toLowerCase().includes(query) ||
          v.categories.some((c) => c.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors, search]);

  const columns: DataTableColumn<Vendor>[] = [
    {
      key: "name",
      header: "Vendor",
      render: (v) => (
        <Link href={`/admin/procurement/${v.id}`} className="text-fg hover:text-accent transition-colors">
          {v.name}
        </Link>
      ),
    },
    { key: "phone", header: "Phone", render: (v) => v.phone },
    { key: "email", header: "Email", render: (v) => v.email ?? "—" },
    {
      key: "categories",
      header: "Categories",
      render: (v) => (v.categories.length > 0 ? v.categories.join(", ") : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/procurement/${v.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${v.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${v.name}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(v)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (vendors.length === 0) {
    return (
      <EmptyState
        title="No vendors yet"
        description="Vendors your team buys construction materials from will appear here."
        action={
          canCreate && (
            <Link href="/admin/procurement/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Vendor"}</AdminText>
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
          placeholder="Search by name, phone, or category"
          aria-label="Search vendors"
          className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(v) => v.id}
        emptyTitle="No vendors match your search"
        emptyDescription="Try a different name, phone number, or category."
      />
    </div>
  );
}

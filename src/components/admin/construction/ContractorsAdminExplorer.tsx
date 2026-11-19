"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { deleteContractor } from "@/features/contractors/actions";
import { cn } from "@/lib/utils";
import type { Contractor } from "@/types/contractor";

export interface ContractorsAdminExplorerProps {
  contractors: Contractor[];
  canCreate: boolean;
  canDelete: boolean;
}

/** Mirrors `VendorsAdminExplorer.tsx` exactly — same shape as every other admin explorer in this app. */
export function ContractorsAdminExplorer({ contractors, canCreate, canDelete }: ContractorsAdminExplorerProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete(contractor: Contractor) {
    if (!window.confirm(`Delete "${contractor.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteContractor(contractor.id);
      if (result.error) window.alert(result.error);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contractors
      .filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (c.specialty?.toLowerCase().includes(query) ?? false) ||
          (c.companyName?.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contractors, search]);

  const columns: DataTableColumn<Contractor>[] = [
    {
      key: "name",
      header: "Contractor",
      render: (c) => (
        <Link href={`/admin/construction/contractors/${c.id}`} className="text-fg hover:text-accent transition-colors">
          {c.name}
        </Link>
      ),
    },
    { key: "specialty", header: "Specialty", render: (c) => c.specialty ?? "—" },
    { key: "phone", header: "Phone", render: (c) => c.phone },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status === "inactive" ? "inactive" : "active"} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/construction/contractors/${c.id}/edit`}>
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

  if (contractors.length === 0) {
    return (
      <EmptyState
        title="No contractors have been added yet"
        description="Contractors your team assigns to construction phases and tasks will appear here."
        action={
          canCreate && (
            <Link href="/admin/construction/contractors/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Contractor"}</AdminText>
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
          placeholder="Search by name, phone, or specialty"
          aria-label="Search contractors"
          className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(c) => c.id}
        emptyTitle="No contractors match your search"
        emptyDescription="Try a different name, phone number, or specialty."
      />
    </div>
  );
}

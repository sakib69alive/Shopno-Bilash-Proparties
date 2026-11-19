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
import { deleteLandowner } from "@/features/landowners/landownerActions";
import { cn } from "@/lib/utils";
import type { Landowner, Agreement } from "@/types/landowner";

export interface LandownersAdminExplorerProps {
  landowners: Landowner[];
  agreements: Agreement[];
  canCreate: boolean;
  canDelete: boolean;
}

/**
 * Search over the real (currently empty) landowner list from
 * `landownerRepository`, with each row's agreement count summarized from
 * `agreementRepository` — same join-in-the-page pattern as every other
 * admin explorer.
 */
export function LandownersAdminExplorer({ landowners, agreements, canCreate, canDelete }: LandownersAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete(landowner: Landowner) {
    if (!window.confirm(`Delete "${landowner.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteLandowner(landowner.id);
    });
  }

  const agreementsByLandowner = useMemo(() => {
    const map = new Map<string, Agreement[]>();
    for (const a of agreements) {
      const list = map.get(a.landownerId) ?? [];
      list.push(a);
      map.set(a.landownerId, list);
    }
    return map;
  }, [agreements]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return landowners
      .filter((l) => !query || l.name.toLowerCase().includes(query) || l.email.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [landowners, search]);

  const columns: DataTableColumn<Landowner>[] = [
    {
      key: "name",
      header: "Landowner",
      render: (l) => (
        <Link href={`/admin/landowners/${l.id}`} className="text-fg hover:text-accent transition-colors">
          {l.name}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (l) => l.email },
    { key: "phone", header: "Phone", render: (l) => l.phone },
    {
      key: "agreements",
      header: "Agreements",
      render: (l) => String(agreementsByLandowner.get(l.id)?.length ?? 0),
      align: "right",
    },
    {
      key: "properties",
      header: "Land Brought",
      render: (l) => String(l.propertyIds.length),
      align: "right",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/landowners/${l.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${l.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${l.name}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(l)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (landowners.length === 0) {
    return (
      <EmptyState
        title="No landowners yet"
        description="People bringing land into a joint-venture development will appear here."
        action={
          canCreate && (
            <Link href="/admin/landowners/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Landowner"}</AdminText>
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
          placeholder={adminCopy("Search by name or email")}
          aria-label="Search landowners"
          className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(l) => l.id}
        emptyTitle="No landowners match your search"
        emptyDescription="Try a different name or email."
      />
    </div>
  );
}

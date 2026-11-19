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
import { formatDate } from "@/lib/format";
import { deleteDocument } from "@/features/documents/actions";
import { cn } from "@/lib/utils";
import type { Document, DocumentOwnerType, DocumentStatus } from "@/types/document";

export interface DocumentRow extends Document {
  /** Resolved server-side — the owner's real name where a repository exists, otherwise its raw id. */
  ownerLabel: string;
  /** Set only when the owner record could be linked to in the admin — e.g. a Project or Unit. */
  ownerHref?: string;
}

export interface DocumentsAdminExplorerProps {
  documents: DocumentRow[];
  canCreate: boolean;
  canDelete: boolean;
}

const OWNER_TYPE_LABEL: Record<DocumentOwnerType, string> = {
  company: "Company",
  project: "Project",
  unit: "Unit",
  customer: "Customer",
  shareholder: "Shareholder",
  landowner: "Landowner",
  vendor: "Vendor",
  transaction: "Transaction",
  constructionActivity: "Construction Activity",
};

const STATUS_OPTIONS: { value: DocumentStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const OWNER_TYPE_OPTIONS: { value: DocumentOwnerType | "all"; label: string }[] = [
  { value: "all", label: "All owner types" },
  { value: "company", label: "Company" },
  { value: "project", label: "Project" },
  { value: "unit", label: "Unit" },
  { value: "customer", label: "Customer" },
  { value: "shareholder", label: "Shareholder" },
  { value: "landowner", label: "Landowner" },
  { value: "vendor", label: "Vendor" },
  { value: "transaction", label: "Transaction" },
];

/**
 * Search/filter over the real (currently empty) document list from
 * `documentRepository` — plain substring match over name/category.
 */
export function DocumentsAdminExplorer({ documents, canCreate, canDelete }: DocumentsAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocumentStatus | "all">("all");
  const [ownerType, setOwnerType] = useState<DocumentOwnerType | "all">("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(doc: DocumentRow) {
    if (!window.confirm(`Delete "${doc.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteDocument(doc.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents
      .filter((doc) => {
        const matchesStatus = status === "all" || doc.status === status;
        const matchesOwnerType = ownerType === "all" || doc.ownerType === ownerType;
        const matchesSearch =
          !query || doc.name.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query);
        return matchesStatus && matchesOwnerType && matchesSearch;
      })
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }, [documents, search, status, ownerType]);

  const columns: DataTableColumn<DocumentRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (d) => (
        <Link href={`/admin/documents/${d.id}`} className="text-fg hover:text-accent transition-colors">
          {d.name}
        </Link>
      ),
    },
    {
      key: "owner",
      header: "Belongs To",
      render: (d) =>
        d.ownerHref ? (
          <Link href={d.ownerHref} className="text-fg-muted hover:text-accent transition-colors">
            {d.ownerLabel}
          </Link>
        ) : (
          <span className="text-fg-muted">{d.ownerLabel}</span>
        ),
    },
    { key: "ownerType", header: "Type", render: (d) => OWNER_TYPE_LABEL[d.ownerType] },
    { key: "category", header: "Category", render: (d) => d.category },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    { key: "uploadDate", header: "Uploaded", render: (d) => formatDate(new Date(d.uploadDate)) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/documents/${d.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${d.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${d.name}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(d)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        description="Documents will appear here once your team starts uploading them."
        action={
          canCreate && (
            <Link href="/admin/documents/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Document"}</AdminText>
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
            placeholder="Search by name or category"
            aria-label="Search documents"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value as DocumentOwnerType | "all")}
          aria-label={adminCopy("Filter by owner type")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {OWNER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DocumentStatus | "all")}
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
        getRowId={(d) => d.id}
        emptyTitle="No documents match your search"
        emptyDescription="Try a different name, category, owner type, or status filter."
      />
    </div>
  );
}

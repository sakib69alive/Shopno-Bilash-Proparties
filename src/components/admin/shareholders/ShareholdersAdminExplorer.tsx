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
import { formatPercent } from "@/lib/format";
import { deleteShareholder } from "@/features/shareholders/shareholderActions";
import { cn } from "@/lib/utils";
import type { Shareholder, Shareholding } from "@/types/shareholder";

export interface ShareholdersAdminExplorerProps {
  shareholders: Shareholder[];
  shareholdings: Shareholding[];
  canCreate: boolean;
  canDelete: boolean;
}

/**
 * Search over the real (currently empty) shareholder list from
 * `shareholderRepository`, with each row's project-count and combined
 * stake summarized from `shareholdingRepository` — same join-in-the-page
 * pattern as every other admin explorer.
 */
export function ShareholdersAdminExplorer({ shareholders, shareholdings, canCreate, canDelete }: ShareholdersAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete(shareholder: Shareholder) {
    if (!window.confirm(`Delete "${shareholder.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteShareholder(shareholder.id);
    });
  }

  const shareholdingsByShareholder = useMemo(() => {
    const map = new Map<string, Shareholding[]>();
    for (const s of shareholdings) {
      const list = map.get(s.shareholderId) ?? [];
      list.push(s);
      map.set(s.shareholderId, list);
    }
    return map;
  }, [shareholdings]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shareholders
      .filter((s) => !query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shareholders, search]);

  const columns: DataTableColumn<Shareholder>[] = [
    {
      key: "name",
      header: "Shareholder",
      render: (s) => (
        <Link href={`/admin/shareholders/${s.id}`} className="text-fg hover:text-accent transition-colors">
          {s.name}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (s) => s.email },
    { key: "phone", header: "Phone", render: (s) => s.phone },
    {
      key: "projects",
      header: "Projects",
      render: (s) => String(shareholdingsByShareholder.get(s.id)?.length ?? 0),
      align: "right",
    },
    {
      key: "stake",
      header: "Combined Stake",
      render: (s) => {
        const holdings = shareholdingsByShareholder.get(s.id) ?? [];
        const total = holdings.reduce((sum, h) => sum + h.sharePercentage, 0);
        return holdings.length > 0 ? formatPercent(total / 100) : "—";
      },
      align: "right",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (s) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/shareholders/${s.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${s.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${s.name}`}
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

  if (shareholders.length === 0) {
    return (
      <EmptyState
        title="No shareholders yet"
        description="People who've invested in a project in exchange for a stake will appear here."
        action={
          canCreate && (
            <Link href="/admin/shareholders/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Shareholder"}</AdminText>
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
          aria-label="Search shareholders"
          className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(s) => s.id}
        emptyTitle="No shareholders match your search"
        emptyDescription="Try a different name or email."
      />
    </div>
  );
}

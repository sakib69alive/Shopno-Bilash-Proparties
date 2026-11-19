"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Check, X, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { completeReminder, dismissReminder, deleteReminder } from "@/features/reminders/actions";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types/reminder";
import type { Project } from "@/types/project";
import type { User } from "@/types/user";

export interface RemindersAdminExplorerProps {
  reminders: Reminder[];
  projects: Project[];
  users: User[];
  canManage: boolean;
}

export function RemindersAdminExplorer({ reminders, projects, users, canManage }: RemindersAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const [isPending, startTransition] = useTransition();

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  function handleComplete(r: Reminder) {
    startTransition(() => {
      completeReminder(r.id);
    });
  }
  function handleDismiss(r: Reminder) {
    startTransition(() => {
      dismissReminder(r.id);
    });
  }
  function handleDelete(r: Reminder) {
    if (!window.confirm(`Delete "${r.title}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteReminder(r.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reminders
      .filter((r) => {
        const matchesStatus = status === "all" || r.status === "pending";
        const matchesSearch = !query || r.title.toLowerCase().includes(query) || (r.relatedEntity?.toLowerCase().includes(query) ?? false);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reminders, search, status]);

  const columns: DataTableColumn<Reminder>[] = [
    {
      key: "title",
      header: "Title",
      render: (r) => (
        <Link href={`/admin/reminders/${r.id}/edit`} className="text-fg hover:text-accent transition-colors">
          {r.title}
        </Link>
      ),
    },
    { key: "date", header: "Date", render: (r) => `${formatDate(new Date(r.date))}${r.time ? ` ${r.time}` : ""}` },
    { key: "priority", header: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
    { key: "project", header: "Project", render: (r) => (r.projectId ? (projectsById.get(r.projectId)?.name ?? "—") : "—") },
    { key: "assigned", header: "Assigned To", render: (r) => (r.assignedUserId ? (usersById.get(r.assignedUserId)?.name ?? "—") : "—") },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) =>
        canManage && (
          <span className="flex items-center justify-end gap-1">
            {r.status === "pending" && (
              <>
                <IconButton icon={Check} label="Mark complete" size="sm" disabled={isPending} onClick={() => handleComplete(r)} />
                <IconButton icon={X} label={adminCopy("Dismiss")} size="sm" disabled={isPending} onClick={() => handleDismiss(r)} />
              </>
            )}
            <Link href={`/admin/reminders/${r.id}/edit`}>
              <IconButton icon={Pencil} label={`Edit ${r.title}`} size="sm" />
            </Link>
            <IconButton
              icon={Trash2}
              label={`Delete ${r.title}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(r)}
              className="hover:text-error"
            />
          </span>
        ),
    },
  ];

  if (reminders.length === 0) {
    return (
      <EmptyState
        title="No reminders yet"
        description="Custom reminders for installments, follow-ups, deadlines, and more will appear here."
        action={
          canManage && (
            <Link href="/admin/reminders/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Reminder"}</AdminText>
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
            placeholder="Search reminders"
            aria-label="Search reminders"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "pending" | "all")}
          aria-label={adminCopy("Filter by status")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="pending">Pending only</option>
          <option value="all">All reminders</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        emptyTitle="No reminders match your search"
        emptyDescription="Try a different title or status filter."
      />
    </div>
  );
}

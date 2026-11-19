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
import { deleteUser } from "@/features/users/actions";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS, type RoleName } from "@/config/roles";
import type { User, UserStatus } from "@/types/user";

export interface UsersAdminExplorerProps {
  users: User[];
  currentUserId: string;
  canManage: boolean;
}

const STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
];

const ROLE_OPTIONS: { value: RoleName | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
  ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
];

/**
 * Search/filter over the real staff/portal account list from
 * `userRepository` — plain substring match over name/email.
 */
export function UsersAdminExplorer({ users, currentUserId, canManage }: UsersAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [role, setRole] = useState<RoleName | "all">("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(user: User) {
    if (!window.confirm(`Delete "${user.name}"'s account? This can't be undone.`)) return;
    startTransition(() => {
      deleteUser(user.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((u) => {
        const matchesStatus = status === "all" || u.status === status;
        const matchesRole = role === "all" || u.role === role;
        const matchesSearch =
          !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
        return matchesStatus && matchesRole && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search, status, role]);

  const columns: DataTableColumn<User>[] = [
    {
      key: "name",
      header: "Name",
      render: (u) => (
        <Link href={`/admin/users/${u.id}`} className="text-fg hover:text-accent transition-colors">
          {u.name}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "role", header: "Role", render: (u) => ROLE_LABELS[u.role] },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (u) => (u.lastLoginAt ? formatDate(new Date(u.lastLoginAt)) : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/users/${u.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${u.name}`} size="sm" />
          </Link>
          {canManage && u.id !== currentUserId && (
            <IconButton
              icon={Trash2}
              label={`Delete ${u.name}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(u)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (users.length === 0) {
    return (
      <EmptyState
        title="No accounts yet"
        description="Staff and portal accounts will appear here once they exist."
        action={
          canManage && (
            <Link href="/admin/users/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Account"}</AdminText>
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
            placeholder={adminCopy("Search by name or email")}
            aria-label="Search users"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleName | "all")}
          aria-label={adminCopy("Filter by role")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | "all")}
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
        getRowId={(u) => u.id}
        emptyTitle="No accounts match your search"
        emptyDescription="Try a different name, email, role, or status filter."
      />
    </div>
  );
}

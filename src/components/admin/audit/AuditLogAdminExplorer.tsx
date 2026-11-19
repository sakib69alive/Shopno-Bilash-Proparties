"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatDateTime } from "@/lib/format";
import { describeAuditAction } from "@/lib/auditActions";
import type { AuditLog } from "@/types/audit-log";
import type { User } from "@/types/user";
import type { Project } from "@/types/project";

export interface AuditLogAdminExplorerProps {
  entries: AuditLog[];
  users: User[];
  projects?: Project[];
}

/**
 * Search/filter over the real audit trail — every login and every content
 * mutation, already recorded by `recordAuditEvent` since Admin Step 3.
 * Nothing here is generated; this page just makes the existing log visible,
 * which it wasn't before (only the Dashboard's last-few-events widget was).
 */
export function AuditLogAdminExplorer({ entries, users, projects = [] }: AuditLogAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const entityTypes = useMemo(() => Array.from(new Set(entries.map((e) => e.entityType))).sort(), [entries]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) => {
        const actor = usersById.get(entry.actorUserId);
        const { label } = describeAuditAction(entry.action);
        const matchesEntity = entityType === "all" || entry.entityType === entityType;
        const matchesProject = projectId === "all" || entry.projectId === projectId;
        const day = entry.occurredAt.slice(0, 10);
        const matchesFrom = !fromDate || day >= fromDate;
        const matchesTo = !toDate || day <= toDate;
        const matchesSearch =
          !query ||
          label.toLowerCase().includes(query) ||
          (actor?.name.toLowerCase().includes(query) ?? false) ||
          entry.entityId.toLowerCase().includes(query);
        return matchesEntity && matchesProject && matchesFrom && matchesTo && matchesSearch;
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [entries, usersById, search, entityType, projectId, fromDate, toDate]);

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "action",
      header: "Event",
      render: (entry) => {
        const { label, Icon } = describeAuditAction(entry.action);
        return (
          <span className="flex items-center gap-2">
            <Icon aria-hidden className="text-fg-subtle size-4 shrink-0" />
            {label}
          </span>
        );
      },
    },
    {
      key: "actor",
      header: "By",
      render: (entry) => usersById.get(entry.actorUserId)?.name ?? "Unknown user",
    },
    { key: "entityType", header: "Entity", render: (entry) => entry.entityType },
    {
      key: "entityId",
      header: "Entity ID",
      render: (entry) => (
        <span className="text-caption text-fg-subtle font-mono" title={entry.entityId}>
          {entry.entityId.slice(0, 8)}
        </span>
      ),
    },
    { key: "project", header: "Project", render: (entry) => (entry.projectId ? (projectsById.get(entry.projectId)?.name ?? "—") : "—") },
    { key: "occurredAt", header: "When", render: (entry) => formatDateTime(new Date(entry.occurredAt)) },
  ];

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Every login and every content change will be recorded here as it happens."
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
            placeholder="Search by event, user, or entity ID"
            aria-label="Search audit log"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          aria-label="Filter by entity type"
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="all"><AdminText>{"All entities"}</AdminText></option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {projects.length > 0 && (
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
        )}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="From date"
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="To date"
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(entry) => entry.id}
        emptyTitle="No activity matches your search"
        emptyDescription="Try a different event, user, or entity."
      />
    </div>
  );
}

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
import { deleteLead } from "@/features/crm/actions";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types/crm";
import type { Project } from "@/types/project";

export interface LeadsAdminExplorerProps {
  leads: Lead[];
  projects: Project[];
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

const STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "interested", label: "Interested" },
  { value: "site-visit", label: "Site Visit" },
  { value: "negotiation", label: "Negotiation" },
  { value: "booking", label: "Booking" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

/**
 * Search/filter over the real (currently empty) lead list from
 * `leadRepository` — plain substring match over name/phone/email, never
 * an "AI" search.
 */
export function LeadsAdminExplorer({ leads, projects, canCreate, canDelete, initialProjectId }: LeadsAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [isPending, startTransition] = useTransition();

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function handleDelete(lead: Lead) {
    if (!window.confirm(`Delete "${lead.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteLead(lead.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads
      .filter((lead) => {
        const matchesStatus = status === "all" || lead.status === status;
        const matchesProject = projectId === "all" || lead.interestedProjectId === projectId;
        const matchesSearch =
          !query ||
          lead.name.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          (lead.email?.toLowerCase().includes(query) ?? false);
        return matchesStatus && matchesProject && matchesSearch;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [leads, search, status, projectId]);

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "name",
      header: "Name",
      render: (l) => (
        <Link href={`/admin/leads/${l.id}`} className="text-fg hover:text-accent transition-colors">
          {l.name}
        </Link>
      ),
    },
    { key: "phone", header: "Phone", render: (l) => l.phone },
    {
      key: "project",
      header: "Interested Project",
      render: (l) =>
        l.interestedProjectId ? (
          <Link href={`/admin/projects/${l.interestedProjectId}`} className="text-fg-muted hover:text-accent transition-colors">
            {projectsById.get(l.interestedProjectId)?.name ?? "—"}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    { key: "source", header: "Source", render: (l) => l.source },
    { key: "status", header: "Status", render: (l) => <StatusBadge status={l.status} /> },
    { key: "priority", header: "Priority", render: (l) => (l.priority ? <StatusBadge status={l.priority} /> : "—") },
    {
      key: "nextFollowUpAt",
      header: "Next Follow-up",
      render: (l) => (l.nextFollowUpAt ? formatDate(new Date(l.nextFollowUpAt)) : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/leads/${l.id}/edit`}>
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

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Enquiries and leads will appear here once your team starts adding them."
        action={
          canCreate && (
            <Link href="/admin/leads/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Lead"}</AdminText>
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
            placeholder="Search by name, phone, or email"
            aria-label="Search leads"
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
          onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}
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
        getRowId={(l) => l.id}
        emptyTitle="No leads match your search"
        emptyDescription="Try a different name, phone, email, or status filter."
      />
    </div>
  );
}

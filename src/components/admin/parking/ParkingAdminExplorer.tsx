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
import { deleteParking } from "@/features/parking/actions";
import { cn } from "@/lib/utils";
import { PARKING_TYPE_MAP } from "@/lib/parkingTypeIcons";
import type { Parking, ParkingStatus, ParkingType } from "@/types/parking";
import type { Project } from "@/types/project";

export interface ParkingRow extends Parking {
  ownerLabel?: string;
}

export interface ParkingAdminExplorerProps {
  parkingSpaces: ParkingRow[];
  projects: Project[];
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

const STATUS_OPTIONS: { value: ParkingStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "reserved", label: "Reserved" },
  { value: "unavailable", label: "Unavailable" },
];

const TYPE_OPTIONS: { value: ParkingType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  ...(Object.keys(PARKING_TYPE_MAP) as ParkingType[]).map((value) => ({ value, label: PARKING_TYPE_MAP[value].label })),
];

export function ParkingAdminExplorer({ parkingSpaces, projects, canCreate, canDelete, initialProjectId }: ParkingAdminExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ParkingStatus | "all">("all");
  const [type, setType] = useState<ParkingType | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [isPending, startTransition] = useTransition();

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function handleDelete(parking: Parking) {
    if (!window.confirm(`Delete "${parking.parkingNumber}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteParking(parking.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return parkingSpaces.filter((p) => {
      const matchesStatus = status === "all" || p.status === status;
      const matchesType = type === "all" || p.type === type;
      const matchesProject = projectId === "all" || p.projectId === projectId;
      const matchesSearch =
        !query || p.parkingNumber.toLowerCase().includes(query) || (p.ownerLabel?.toLowerCase().includes(query) ?? false);
      return matchesStatus && matchesType && matchesProject && matchesSearch;
    });
  }, [parkingSpaces, search, status, type, projectId]);

  const columns: DataTableColumn<ParkingRow>[] = [
    {
      key: "parkingNumber",
      header: "Parking #",
      render: (p) => (
        <Link href={`/admin/parking/${p.id}`} className="text-fg hover:text-accent transition-colors">
          {p.parkingNumber}
        </Link>
      ),
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
    { key: "zone", header: "Zone", render: (p) => p.zone ?? "—" },
    {
      key: "type",
      header: "Type",
      render: (p) => {
        if (!p.type) return <span className="text-fg-subtle">—</span>;
        const { icon: Icon, label } = PARKING_TYPE_MAP[p.type];
        return (
          <span className="text-fg-muted inline-flex items-center gap-1.5">
            <Icon aria-hidden className="size-4" />
            {label}
          </span>
        );
      },
    },
    { key: "owner", header: "Owner", render: (p) => p.ownerLabel ?? <span className="text-fg-subtle">—</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/parking/${p.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${p.parkingNumber}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${p.parkingNumber}`}
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

  if (parkingSpaces.length === 0) {
    return (
      <EmptyState
        title="No parking spaces configured yet"
        description="Parking spaces will appear here once your team starts adding them to a project."
        action={
          canCreate && (
            <Link href="/admin/parking/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Parking"}</AdminText>
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
            placeholder="Search by parking number or owner"
            aria-label="Search parking"
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
          onChange={(e) => setStatus(e.target.value as ParkingStatus | "all")}
          aria-label={adminCopy("Filter by status")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ParkingType | "all")}
          aria-label={adminCopy("Filter by type")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {TYPE_OPTIONS.map((opt) => (
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
        emptyTitle="No parking spaces match your search"
        emptyDescription="Try a different number, owner, project, or status filter."
      />
    </div>
  );
}

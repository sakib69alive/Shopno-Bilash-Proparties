"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { formatBDT } from "@/lib/format";
import { deleteUnit } from "@/features/units/actions";
import { cn } from "@/lib/utils";
import type { Unit, UnitStatus } from "@/types/unit";
import type { Building, Floor, Project } from "@/types/project";

export interface PropertiesAdminExplorerProps {
  units: Unit[];
  projects: Project[];
  buildings: Building[];
  floors: Floor[];
  /** Unit id → resolved current-owner display name, computed server-side (owner resolution needs repositories, unreachable from a client component). */
  ownerLabels: Record<string, string>;
  canCreate: boolean;
  canDelete: boolean;
  initialProjectId?: string;
}

type HeldBy = "company" | "landowner" | "client" | "shareholder";
const HELD_LABEL: Record<HeldBy, string> = { company: "Company", landowner: "Landowner share", client: "Clients", shareholder: "Shareholders" };

/** Who holds a flat: a flat with no owner recorded is the company's own (still to sell, or kept). */
function heldBy(unit: Unit): HeldBy {
  if (unit.customerId) return "client";
  if (unit.shareholderId) return "shareholder";
  if (unit.landownerAllocationId) return "landowner";
  return "company";
}

const STATUS_OPTIONS: { value: UnitStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "booked", label: "Booked" },
  { value: "sold", label: "Sold" },
  { value: "allocated", label: "Allocated" },
  { value: "on-hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Search/filter over the real (currently empty) unit list from
 * `unitRepository`, joined client-side to the projects already fetched by
 * the page (Admin Step 5's `projectRepository` — no second project dataset
 * is created just to populate the filter dropdown, per brief §9).
 */
export function PropertiesAdminExplorer({
  units,
  projects,
  buildings,
  floors,
  ownerLabels,
  canCreate,
  canDelete,
  initialProjectId,
}: PropertiesAdminExplorerProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UnitStatus | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">(initialProjectId ?? "all");
  const [buildingId, setBuildingId] = useState<string | "all">("all");
  const [floorId, setFloorId] = useState<string | "all">("all");
  const [held, setHeld] = useState<HeldBy | "all">("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(unit: Unit) {
    if (!window.confirm(`Delete unit "${unit.unitNumber}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteUnit(unit.id);
    });
  }

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const buildingsById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);
  const floorsById = useMemo(() => new Map(floors.map((f) => [f.id, f])), [floors]);
  const buildingOptions = useMemo(
    () => (projectId === "all" ? buildings : buildings.filter((b) => b.projectId === projectId)),
    [buildings, projectId],
  );
  const floorOptions = useMemo(() => (buildingId === "all" ? [] : floors.filter((f) => f.buildingId === buildingId)), [floors, buildingId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return units.filter((unit) => {
      const project = projectsById.get(unit.projectId);
      const matchesStatus = status === "all" || unit.status === status;
      const matchesProject = projectId === "all" || unit.projectId === projectId;
      const matchesBuilding = buildingId === "all" || unit.buildingId === buildingId;
      const matchesFloor = floorId === "all" || unit.floorId === floorId;
      const matchesHeld = held === "all" || heldBy(unit) === held;
      const matchesSearch =
        !query ||
        unit.unitNumber.toLowerCase().includes(query) ||
        (project?.name.toLowerCase().includes(query) ?? false) ||
        (ownerLabels[unit.id]?.toLowerCase().includes(query) ?? false);
      return matchesStatus && matchesProject && matchesBuilding && matchesFloor && matchesHeld && matchesSearch;
    });
  }, [units, projectsById, ownerLabels, search, status, projectId, buildingId, floorId, held]);

  // Who holds how many flats, for the project picked (or all) — click a count to list just those flats.
  const holdings = useMemo(() => {
    const scope = units.filter((u) => (projectId === "all" || u.projectId === projectId) && (buildingId === "all" || u.buildingId === buildingId));
    const counts: Record<HeldBy, number> = { company: 0, landowner: 0, client: 0, shareholder: 0 };
    for (const u of scope) counts[heldBy(u)] += 1;
    return { total: scope.length, counts, company: scope.filter((u) => heldBy(u) === "company") };
  }, [units, projectId, buildingId]);

  const columns: DataTableColumn<Unit>[] = [
    {
      key: "unitNumber",
      header: "Unit",
      render: (u) => (
        <Link href={`/admin/properties/${u.id}`} className="text-fg hover:text-accent transition-colors">
          {u.unitNumber}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (u) => {
        const project = projectsById.get(u.projectId);
        return project ? (
          <Link href={`/admin/projects/${project.id}`} className="text-fg-muted hover:text-accent transition-colors">
            {project.name}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    { key: "building", header: "Building", render: (u) => buildingsById.get(u.buildingId)?.name ?? "—" },
    { key: "floor", header: "Floor", render: (u) => floorsById.get(u.floorId)?.label ?? "—" },
    { key: "owner", header: "Owner", render: (u) => ownerLabels[u.id] ?? <span className="text-fg-muted font-medium">Company</span> },
    { key: "area", header: "Area", render: (u) => `${u.sizeSqft.toLocaleString()} sqft`, align: "right" },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    { key: "price", header: "Price", render: (u) => formatBDT(u.finalPrice.amount), align: "right" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/properties/${u.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${u.unitNumber}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${u.unitNumber}`}
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

  if (units.length === 0) {
    return (
      <EmptyState
        title="No properties yet"
        description="Units will appear here once your team starts adding them to a project."
        action={
          canCreate && (
            <Link href="/admin/properties/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              New Property
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button type="button" onClick={() => setHeld("all")} aria-pressed={held === "all"} className={cn("rounded-xl border px-3 py-2.5 text-left transition-colors", held === "all" ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:border-accent")}>
          <span className="text-h4 block tabular-nums">{holdings.total}</span>
          <span className="text-caption text-fg-subtle">All flats</span>
        </button>
        {(Object.keys(HELD_LABEL) as HeldBy[]).map((k) => (
          <button key={k} type="button" onClick={() => setHeld(held === k ? "all" : k)} aria-pressed={held === k} className={cn("rounded-xl border px-3 py-2.5 text-left transition-colors", held === k ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:border-accent")}>
            <span className="text-h4 block tabular-nums">{holdings.counts[k]}</span>
            <span className="text-caption text-fg-subtle">{k === "company" ? "Company's own" : HELD_LABEL[k]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by unit, project, or owner"
            aria-label="Search properties"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setBuildingId("all");
            setFloorId("all");
          }}
          aria-label="Filter by project"
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={buildingId}
          onChange={(e) => {
            setBuildingId(e.target.value);
            setFloorId("all");
          }}
          aria-label="Filter by building"
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="all">All buildings</option>
          {buildingOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {buildingId !== "all" && (
          <select
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            aria-label="Filter by floor"
            className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            <option value="all">All floors</option>
            {floorOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UnitStatus | "all")}
          aria-label="Filter by status"
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
        emptyTitle="No properties match your search"
        emptyDescription="Try a different unit, project, or status filter."
      />
    </div>
  );
}

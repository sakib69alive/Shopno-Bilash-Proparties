"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { IconButton } from "@/components/ui/IconButton";
import { Button, buttonVariants } from "@/components/ui/Button";
import { UNIT_STATUS_LABEL, type Unit, type UnitStatus } from "@/content/units";
import { deleteUnitContent, deleteUnitsContent, setUnitStatus } from "@/features/unitContent/actions";
import { cn } from "@/lib/utils";

type Row = Unit & { projectName: string };

export interface UnitContentAdminTableProps {
  units: Row[];
  projects: { slug: string; name: string }[];
  /** Project to show first — from `?project=` (e.g. the project edit page's "Manage units"). */
  initialProject?: string;
  canUpdate: boolean;
  canDelete: boolean;
}

const STATUSES = Object.entries(UNIT_STATUS_LABEL) as [UnitStatus, string][];
const SELECT =
  "border-border-strong bg-surface-raised text-fg h-9 rounded-md border px-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60";

/**
 * Properties list: filter by project, change a unit's status right in its row
 * (no form), tick several rows and delete them in one go. Every change goes
 * through the same server actions the edit form uses, so the public site
 * updates the same way.
 */
export function UnitContentAdminTable({ units, projects, initialProject = "", canUpdate, canDelete }: UnitContentAdminTableProps) {
  const [isPending, startTransition] = useTransition();
  const [project, setProject] = useState(initialProject);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => (project ? units.filter((u) => u.projectSlug === project) : units), [units, project]);
  const availableCount = rows.filter((u) => u.status === "available").length;

  function handleDelete(unit: Unit) {
    if (!window.confirm(`Delete "${unit.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteUnitContent(unit.id);
    });
  }

  function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected ${ids.length === 1 ? "unit" : "units"}? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteUnitsContent(ids);
      setSelected(new Set());
    });
  }

  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: "Name", render: (u) => <span className="text-fg">{u.name}</span> },
    { key: "project", header: "Project", render: (u) => u.projectName },
    { key: "unitType", header: "Type", render: (u) => u.unitType },
    {
      key: "status",
      header: "Status",
      render: (u) =>
        canUpdate ? (
          <select
            aria-label={`Status of ${u.name}`}
            defaultValue={u.status}
            disabled={isPending}
            className={SELECT}
            onChange={(e) => {
              const next = e.target.value as UnitStatus;
              startTransition(() => {
                setUnitStatus(u.id, next);
              });
            }}
          >
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          UNIT_STATUS_LABEL[u.status]
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/content/properties/${u.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${u.name}`} size="sm" />
          </Link>
          {canDelete && (
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-fg-muted">Project</span>
            <select
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setSelected(new Set());
              }}
              className={SELECT}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-body-sm text-fg-muted">
            {rows.length} {rows.length === 1 ? "unit" : "units"} · {availableCount} available
          </p>
        </div>

        {canDelete && selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected} loading={isPending}>
            <Trash2 aria-hidden className="size-4" />
            Delete {selected.size} selected
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(u) => u.id}
        selectable={canDelete}
        selectedIds={selected}
        onSelectionChange={setSelected}
        emptyTitle="No properties yet."
        emptyDescription="Create the first property to publish it on the public site."
        emptyAction={
          <Link
            href="/admin/content/properties/new"
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}
          >
            New Property
          </Link>
        }
      />
    </div>
  );
}

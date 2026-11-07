"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpToLine, Pencil, Star, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";
import { deleteProjectContent, moveProjectContent } from "@/features/projectContent/actions";
import type { MoveDirection } from "@/lib/sortOrder";
import { cn } from "@/lib/utils";

export interface ProjectContentAdminTableProps {
  projects: Project[];
  canDelete: boolean;
  /** Show the ordering arrows (needs `content.update`). */
  canReorder?: boolean;
}

export function ProjectContentAdminTable({ projects, canDelete, canReorder = false }: ProjectContentAdminTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteProjectContent(project.id);
    });
  }

  function handleMove(project: Project, direction: MoveDirection) {
    startTransition(async () => {
      await moveProjectContent(project.id, direction);
    });
  }

  const columns: DataTableColumn<Project>[] = [
    ...(canReorder
      ? [
          {
            key: "order",
            header: "Order",
            render: (p: Project) => {
              const index = projects.findIndex((x) => x.id === p.id);
              return (
                <span className="flex items-center gap-0.5">
                  <IconButton icon={ArrowUpToLine} label={`Move ${p.name} to the top`} size="sm" disabled={isPending || index === 0} onClick={() => handleMove(p, "top")} />
                  <IconButton icon={ArrowUp} label={`Move ${p.name} up`} size="sm" disabled={isPending || index === 0} onClick={() => handleMove(p, "up")} />
                  <IconButton icon={ArrowDown} label={`Move ${p.name} down`} size="sm" disabled={isPending || index === projects.length - 1} onClick={() => handleMove(p, "down")} />
                </span>
              );
            },
          } satisfies DataTableColumn<Project>,
        ]
      : []),
    {
      key: "name",
      header: "Name",
      render: (p) => (
        <span className="flex items-center gap-2">
          {p.featured && <Star aria-hidden className="text-accent size-3.5 shrink-0 fill-current" />}
          <span className="text-fg">{p.name}</span>
        </span>
      ),
    },
    { key: "city", header: "City", render: (p) => p.city },
    { key: "projectType", header: "Type", render: (p) => p.projectType },
    { key: "status", header: "Status", render: (p) => PROJECT_STATUS_LABEL[p.status] },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/content/projects/${p.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${p.name}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${p.name}`}
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

  return (
    <DataTable
      columns={columns}
      data={projects}
      getRowId={(p) => p.id}
      emptyTitle="No projects yet."
      emptyDescription="Create the first project to publish it on the public site."
      emptyAction={
        <Link href="/admin/content/projects/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
          New Project
        </Link>
      }
    />
  );
}

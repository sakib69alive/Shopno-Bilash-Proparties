"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { deleteMilestone } from "@/features/companyMilestones/actions";
import { MILESTONE_ICON_MAP } from "@/lib/milestoneIcons";
import type { CompanyMilestone } from "@/types/companyMilestone";
import { cn } from "@/lib/utils";

export interface MilestoneAdminTableProps {
  milestones: CompanyMilestone[];
  canDelete: boolean;
}

export function MilestoneAdminTable({ milestones, canDelete }: MilestoneAdminTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(milestone: CompanyMilestone) {
    if (!window.confirm(`Delete "${milestone.title}" (${milestone.year})? This can't be undone.`)) return;
    startTransition(() => {
      deleteMilestone(milestone.id);
    });
  }

  const columns: DataTableColumn<CompanyMilestone>[] = [
    { key: "year", header: "Year", render: (m) => <span className="text-numeric">{m.year}</span> },
    {
      key: "title",
      header: "Title",
      render: (m) => {
        const { icon: Icon } = MILESTONE_ICON_MAP[m.icon];
        return (
          <span className="flex items-center gap-2">
            <Icon aria-hidden className="text-accent size-4 shrink-0" />
            <span className="text-fg">{m.title}</span>
          </span>
        );
      },
    },
    { key: "summary", header: "Summary", render: (m) => <span className="text-fg-muted line-clamp-1">{m.summary}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/content/story/${m.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${m.title}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${m.title}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(m)}
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
      data={milestones}
      getRowId={(m) => m.id}
      emptyTitle="No story entries yet."
      emptyDescription="Add your first milestone to publish it on the public About page's timeline."
      emptyAction={
        <Link href="/admin/content/story/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
          <AdminText>{"New Entry"}</AdminText>
        </Link>
      }
    />
  );
}

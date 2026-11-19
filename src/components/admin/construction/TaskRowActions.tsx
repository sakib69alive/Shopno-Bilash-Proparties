"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { deleteTask } from "@/features/construction/taskActions";

export function TaskRowActions({ phaseId, taskId }: { phaseId: string; taskId: string }) {
  const { t: adminCopy } = useUiLanguage();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this task? This can't be undone.")) return;
    startTransition(() => {
      deleteTask(phaseId, taskId);
    });
  }

  return (
    <span className="flex items-center gap-1">
      <Link href={`/admin/construction/tasks/${taskId}/edit`}>
        <IconButton icon={Pencil} label={adminCopy("Edit task")} size="sm" />
      </Link>
      <IconButton icon={Trash2} label={adminCopy("Delete task")} size="sm" disabled={isPending} onClick={handleDelete} className="hover:text-error" />
    </span>
  );
}

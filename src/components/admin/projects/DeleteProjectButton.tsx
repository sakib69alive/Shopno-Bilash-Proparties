"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteProject } from "@/features/projects/actions";

/** Detail-page delete — unlike the list table's row delete, this navigates away after removing the record, since there's nothing left on this page to show. */
export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteProject(id);
      router.push("/admin/projects");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} loading={isPending} className="hover:text-error">
      <Trash2 aria-hidden className="size-3.5" />
      <AdminText>{"Delete"}</AdminText>
    </Button>
  );
}

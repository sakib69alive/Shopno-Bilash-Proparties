"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteUnit } from "@/features/units/actions";

/** Detail-page delete — navigates away after removing the record. */
export function DeleteUnitButton({ id, unitNumber }: { id: string; unitNumber: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete unit "${unitNumber}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteUnit(id);
      router.push("/admin/properties");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} loading={isPending} className="hover:text-error">
      <Trash2 aria-hidden className="size-3.5" />
      <AdminText>{"Delete"}</AdminText>
    </Button>
  );
}

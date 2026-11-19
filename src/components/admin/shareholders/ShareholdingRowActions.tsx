"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { deleteShareholding } from "@/features/shareholders/shareholdingActions";

export function ShareholdingRowActions({ shareholderId, holdingId }: { shareholderId: string; holdingId: string }) {
  const { t: adminCopy } = useUiLanguage();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this shareholding? This can't be undone.")) return;
    startTransition(() => {
      deleteShareholding(shareholderId, holdingId);
    });
  }

  return (
    <span className="flex items-center gap-1">
      <Link href={`/admin/shareholders/holdings/${holdingId}/edit`}>
        <IconButton icon={Pencil} label={adminCopy("Edit shareholding")} size="sm" />
      </Link>
      <IconButton icon={Trash2} label="Delete shareholding" size="sm" disabled={isPending} onClick={handleDelete} className="hover:text-error" />
    </span>
  );
}

"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { deleteAgreement } from "@/features/landowners/agreementActions";

export function AgreementRowActions({ landownerId, agreementId }: { landownerId: string; agreementId: string }) {
  const { t: adminCopy } = useUiLanguage();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this agreement? This can't be undone.")) return;
    startTransition(() => {
      deleteAgreement(landownerId, agreementId);
    });
  }

  return (
    <span className="flex items-center gap-1">
      <Link href={`/admin/landowners/agreements/${agreementId}/edit`}>
        <IconButton icon={Pencil} label={adminCopy("Edit agreement")} size="sm" />
      </Link>
      <IconButton icon={Trash2} label="Delete agreement" size="sm" disabled={isPending} onClick={handleDelete} className="hover:text-error" />
    </span>
  );
}

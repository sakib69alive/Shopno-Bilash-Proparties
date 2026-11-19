"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteInstallment } from "@/features/sales/installmentActions";

/** Detail-page delete — navigates away after removing the record. */
export function DeleteInstallmentButton({ id, installmentNumber }: { id: string; installmentNumber: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete installment #${installmentNumber}? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteInstallment(id);
      router.push("/admin/sales/installments");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} loading={isPending} className="hover:text-error">
      <Trash2 aria-hidden className="size-3.5" />
      <AdminText>{"Delete"}</AdminText>
    </Button>
  );
}

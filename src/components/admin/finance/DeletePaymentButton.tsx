"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deletePayment } from "@/features/finance/paymentActions";

/** Detail-page delete — navigates away after removing the record. */
export function DeletePaymentButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("Delete this payment? This can't be undone.")) return;
    startTransition(async () => {
      await deletePayment(id);
      router.push("/admin/sales/payments");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} loading={isPending} className="hover:text-error">
      <Trash2 aria-hidden className="size-3.5" />
      <AdminText>{"Delete"}</AdminText>
    </Button>
  );
}

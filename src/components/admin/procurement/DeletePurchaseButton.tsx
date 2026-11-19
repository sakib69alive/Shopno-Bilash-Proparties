"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deletePurchase } from "@/features/procurement/purchaseActions";

/** Detail-page delete — navigates away after removing the record. */
export function DeletePurchaseButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("Delete this purchase? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deletePurchase(id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      router.push("/admin/procurement/purchases");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} loading={isPending} className="hover:text-error">
      <Trash2 aria-hidden className="size-3.5" />
      <AdminText>{"Delete"}</AdminText>
    </Button>
  );
}

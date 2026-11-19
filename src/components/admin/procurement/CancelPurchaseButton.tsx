"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cancelPurchase } from "@/features/procurement/purchaseActions";

export function CancelPurchaseButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    if (!window.confirm("Cancel this purchase? It will no longer be receivable.")) return;
    startTransition(async () => {
      const result = await cancelPurchase(id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCancel} loading={isPending} className="hover:text-error">
      <XCircle aria-hidden className="size-3.5" />
      <AdminText>{"Cancel"}</AdminText>
    </Button>
  );
}

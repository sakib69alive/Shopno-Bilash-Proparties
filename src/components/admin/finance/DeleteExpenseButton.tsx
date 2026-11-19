"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteExpense } from "@/features/finance/expenseActions";

/** Detail-page delete — navigates away after removing the record. */
export function DeleteExpenseButton({ id, description }: { id: string; description: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete "${description}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteExpense(id);
      router.push("/admin/finance/expenses");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} loading={isPending} className="hover:text-error">
      <Trash2 aria-hidden className="size-3.5" />
      <AdminText>{"Delete"}</AdminText>
    </Button>
  );
}

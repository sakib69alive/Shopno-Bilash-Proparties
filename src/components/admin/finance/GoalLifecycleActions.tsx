"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { markCostAllocationCompleted, archiveCostAllocation } from "@/features/costAllocations/actions";

export interface GoalLifecycleActionsProps {
  costAllocationId: string;
  showMarkCompleted: boolean;
  isArchived: boolean;
}

/** Reaching 100% collection alone is "fully-funded" — "completed"/"archived" are deliberate Admin actions, not implied automatically. */
export function GoalLifecycleActions({ costAllocationId, showMarkCompleted, isArchived }: GoalLifecycleActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    startTransition(async () => {
      await markCostAllocationCompleted(costAllocationId);
      router.refresh();
    });
  }

  function handleArchive() {
    if (!window.confirm("Archive this goal? It will be marked out of the active list.")) return;
    startTransition(async () => {
      await archiveCostAllocation(costAllocationId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {showMarkCompleted && (
        <Button variant="outline" size="sm" onClick={handleComplete} loading={isPending}>
          Mark Completed
        </Button>
      )}
      {!isArchived && (
        <Button variant="outline" size="sm" onClick={handleArchive} loading={isPending}>
          <AdminText>{"Archive"}</AdminText>
        </Button>
      )}
    </div>
  );
}

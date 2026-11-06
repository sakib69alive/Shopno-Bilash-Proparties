"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { generateContributions } from "@/features/costAllocations/actions";

/** The "confirm" half of the review-then-confirm flow — the actual per-owner table is already shown above this button (`AllocationPreviewTable`), so this is a real informed confirmation, not a blind generate-on-click. Only used for "sqft"/"unit-ratio" methods; "fixed-unit"/"custom" methods generate via `EditableAllocationPreviewTable`'s own button instead. */
export function GenerateContributionsButton({ costAllocationId }: { costAllocationId: string }) {
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    if (!window.confirm("Confirm this allocation and generate contributions? This can only be done once.")) return;
    setError(undefined);
    startTransition(async () => {
      const result = await generateContributions(costAllocationId);
      if (result.error) setError(result.error);
      else {
        router.replace(`?notified=${result.notified ?? 0}&withoutApp=${result.withoutApp ?? 0}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleGenerate} loading={isPending}>
        Confirm &amp; Generate
      </Button>
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  );
}

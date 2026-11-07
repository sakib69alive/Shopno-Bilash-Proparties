"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createContributionAdjustment, type AdjustmentFormState } from "@/features/costAllocations/adjustmentActions";

export interface ContributionAdjustmentFormProps {
  costAllocationId: string;
  contributionId: string;
}

const TYPE_OPTIONS = [
  { value: "discount", label: "Discount" },
  { value: "waiver", label: "Waiver" },
  { value: "additional-charge", label: "Additional Charge" },
  { value: "correction", label: "Correction" },
  { value: "refund", label: "Refund" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Add Adjustment
    </Button>
  );
}

/** A flat, non-destructive correction record — no approval workflow, matches the brief's explicit "don't over-build a full accounting system" instruction. */
export function ContributionAdjustmentForm({ costAllocationId, contributionId }: ContributionAdjustmentFormProps) {
  const [open, setOpen] = useState(false);
  const boundAction = createContributionAdjustment.bind(null, costAllocationId);
  const [state, formAction] = useActionState(boundAction as (s: AdjustmentFormState, f: FormData) => Promise<AdjustmentFormState>, {});

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-3.5" />
        Add Adjustment
      </Button>
    );
  }

  return (
    <PersistForm state={state} action={formAction} className="bg-surface flex flex-col gap-3 rounded-md p-3">
      <input type="hidden" name="contributionId" value={contributionId} />

      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-2.5 py-2">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" name="type" required options={TYPE_OPTIONS} placeholder="Choose a type" />
        <Input
          label="Amount (BDT)"
          name="amount"
          type="number"
          required
          helperText="Enter a positive number — discount/waiver/refund reduce what's owed automatically."
        />
      </div>
      <Textarea label="Reason" name="reason" required rows={2} placeholder="Why this adjustment is being made" />

      <div className="flex items-center gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </PersistForm>
  );
}

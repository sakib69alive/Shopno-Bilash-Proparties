"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createFinancialAdjustment, type FinancialAdjustmentFormState } from "@/features/finance/adjustmentActions";

export interface FinancialAdjustmentFormProps {
  targetType: "expense" | "contractorPayment";
  targetId: string;
}

const TYPE_OPTIONS = [
  { value: "discount", label: "Discount" },
  { value: "waiver", label: "Waiver" },
  { value: "additional-charge", label: "Additional Charge" },
  { value: "correction", label: "Correction" },
  { value: "refund", label: "Refund" },
  { value: "reversal", label: "Reversal" },
  { value: "transfer", label: "Transfer Adjustment" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Add Adjustment
    </Button>
  );
}

/** Same flat, non-destructive, no-approval-workflow pattern as `ContributionAdjustmentForm` (Prompt 3), applied to a `ProjectExpense`/`ContractorPayment` instead of an `OwnerContribution`. */
export function FinancialAdjustmentForm({ targetType, targetId }: FinancialAdjustmentFormProps) {
  const [open, setOpen] = useState(false);
  const boundAction = createFinancialAdjustment.bind(null, targetType, targetId);
  const [state, formAction] = useActionState(
    boundAction as (s: FinancialAdjustmentFormState, f: FormData) => Promise<FinancialAdjustmentFormState>,
    {},
  );

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-3.5" />
        Add Adjustment / Refund
      </Button>
    );
  }

  return (
    <PersistForm state={state} action={formAction} className="bg-surface flex flex-col gap-3 rounded-md p-3">
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
          helperText="Enter a positive number — discount/waiver/refund/reversal reduce the effective cost automatically."
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

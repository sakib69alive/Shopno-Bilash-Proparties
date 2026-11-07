"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createOwnershipTransfer, type OwnershipTransferFormState } from "@/features/ownership/transferActions";

export interface OwnershipTransferFormProps {
  unitId: string;
  currentOwnerLabel: string;
  customerOptions: { value: string; label: string }[];
}

const OBLIGATION_OPTIONS = [
  { value: "previous-pays", label: "Previous owner pays" },
  { value: "new-assumes", label: "New owner assumes" },
  { value: "split", label: "Split between both" },
  { value: "waived", label: "Waived" },
  { value: "adjusted", label: "Adjusted" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "completed", label: "Complete Now" },
  { value: "pending", label: "Pending Approval" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Record Transfer
    </Button>
  );
}

/** No approval workflow beyond the optional "Pending Approval" status — same "don't over-build accounting/workflow" convention as every other adjustment feature in this app (see `createOwnershipTransfer`'s doc comment). */
export function OwnershipTransferForm({ unitId, currentOwnerLabel, customerOptions }: OwnershipTransferFormProps) {
  const [open, setOpen] = useState(false);
  const boundAction = createOwnershipTransfer.bind(null, unitId);
  const [state, formAction] = useActionState(
    boundAction as (s: OwnershipTransferFormState, f: FormData) => Promise<OwnershipTransferFormState>,
    {},
  );

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightLeft aria-hidden className="size-3.5" />
        Transfer Ownership
      </Button>
    );
  }

  return (
    <PersistForm state={state} action={formAction} className="bg-surface flex flex-col gap-3 rounded-md p-3">
      <p className="text-caption text-fg-subtle">Transferring from {currentOwnerLabel} to a new customer.</p>
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-2.5 py-2">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="New Owner" name="newOwnerId" required options={customerOptions} placeholder="Choose a customer" />
        <Input label="Date" name="date" type="date" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Transfer Value (BDT, optional)" name="transferValue" type="number" />
        <Select label="Outstanding Obligations" name="obligationHandling" required options={OBLIGATION_OPTIONS} placeholder="Choose how obligations are handled" />
      </div>
      <Textarea label="Reason" name="reason" required rows={2} placeholder="Why this unit is being transferred" />
      <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue="completed" />

      <div className="flex items-center gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </PersistForm>
  );
}

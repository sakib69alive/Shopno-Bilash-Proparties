"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatBDT } from "@/lib/format";
import type { ContributionPaymentFormState } from "@/features/costAllocations/actions";

export interface InstallmentOption {
  id: string;
  label: string;
  dueDate: string;
  outstanding: number;
}

export interface ContributionPaymentFormProps {
  action: (state: ContributionPaymentFormState, formData: FormData) => Promise<ContributionPaymentFormState>;
  contributionId: string;
  maxAmount: number;
  /** When the goal has an installment plan, the Admin picks which installment this payment applies to — omitted entirely when the goal has no installments (today's plain lump-payment behavior, unchanged). */
  installmentOptions?: InstallmentOption[];
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "mobile-banking", label: "Mobile Banking" },
  { value: "card", label: "Card" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Record Payment
    </Button>
  );
}

/** Toggled open per contribution row — collapsed by default so the table stays scannable. */
export function ContributionPaymentForm({ action, contributionId, maxAmount, installmentOptions }: ContributionPaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});
  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");

  const hasInstallments = installmentOptions && installmentOptions.length > 0;
  const selectedInstallment = installmentOptions?.find((i) => i.id === selectedInstallmentId);
  const effectiveMax = selectedInstallment ? selectedInstallment.outstanding : maxAmount;

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-3.5" />
        Record Payment
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

      {hasInstallments && (
        <>
          <Select
            label="Installment"
            name="installmentObligationId"
            required
            options={installmentOptions!.map((i) => ({
              value: i.id,
              label: `${i.label} — Due ${i.dueDate} — Remaining ${formatBDT(i.outstanding)}`,
            }))}
            value={selectedInstallmentId}
            onChange={(e) => setSelectedInstallmentId(e.target.value)}
            placeholder="Choose an installment"
          />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Amount (BDT)"
          name="amount"
          type="number"
          required
          max={effectiveMax}
          helperText={`Outstanding: ${formatBDT(effectiveMax)}`}
        />
        <Input label="Date" name="date" type="date" required />
      </div>

      <Select label="Method" name="method" required options={METHOD_OPTIONS} placeholder="Choose a method" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Reference (optional)" name="reference" placeholder="e.g. Cheque number" />
        <Input label="Receipt Number (optional)" name="receiptNumber" />
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </PersistForm>
  );
}

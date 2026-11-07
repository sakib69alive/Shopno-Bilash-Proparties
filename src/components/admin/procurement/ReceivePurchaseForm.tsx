"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { recordPurchaseReceipt, type ReceiptFormState } from "@/features/procurement/receiptActions";

export interface ReceivePurchaseFormProps {
  purchaseId: string;
  remainingQuantity: number;
  unit: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Record Receipt
    </Button>
  );
}

/** Records the physical arrival of goods — only the quantity entered here ever becomes real stock (see `recordPurchaseReceipt`'s own doc comment). */
export function ReceivePurchaseForm({ purchaseId, remainingQuantity, unit }: ReceivePurchaseFormProps) {
  const boundAction = recordPurchaseReceipt.bind(null, purchaseId);
  const [state, formAction] = useActionState<ReceiptFormState, FormData>(boundAction, {});

  return (
    <PersistForm state={state} action={formAction} className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={`Quantity Received (${unit})`}
          name="quantityReceived"
          type="number"
          required
          max={remainingQuantity}
          helperText={`${remainingQuantity} ${unit} remaining to receive`}
        />
        <Input label="Received Date" name="receivedDate" type="date" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Batch/Lot # (optional)" name="batchNumber" />
        <Input label="Delivery Note (optional)" name="deliveryNote" />
      </div>
      <Input label="Notes (optional)" name="notes" />
      <div>
        <SubmitButton />
      </div>
    </PersistForm>
  );
}

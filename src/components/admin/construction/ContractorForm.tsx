"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Contractor } from "@/types/contractor";
import type { ContractorFormState } from "@/features/contractors/actions";

export interface ContractorFormProps {
  action: (state: ContractorFormState, formData: FormData) => Promise<ContractorFormState>;
  contractor?: Contractor;
  submitLabel: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

/** Mirrors `VendorForm.tsx`'s exact field layout — the labor-side equivalent of a material supplier. */
export function ContractorForm({ action, contractor, submitLabel }: ContractorFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" required defaultValue={contractor?.name} placeholder="e.g. Rahman Piling Works" />
        <Input label="Company Name (optional)" name="companyName" defaultValue={contractor?.companyName} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Contact Person (optional)" name="contactPerson" defaultValue={contractor?.contactPerson} />
        <Input label="Phone" name="phone" required defaultValue={contractor?.phone} placeholder="+880 1XXX-XXXXXX" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Email (optional)" name="email" type="email" defaultValue={contractor?.email} />
        <Input label="Specialty (optional)" name="specialty" defaultValue={contractor?.specialty} placeholder="e.g. Piling, Electrical, Tiles" />
      </div>

      <Input label="Address (optional)" name="address" defaultValue={contractor?.address} />
      <Input label="Notes (optional)" name="notes" defaultValue={contractor?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

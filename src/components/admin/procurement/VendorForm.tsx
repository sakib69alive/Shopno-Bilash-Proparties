"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Vendor } from "@/types/procurement";
import type { VendorFormState } from "@/features/procurement/vendorActions";

export interface VendorFormProps {
  action: (state: VendorFormState, formData: FormData) => Promise<VendorFormState>;
  vendor?: Vendor;
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

export function VendorForm({ action, vendor, submitLabel }: VendorFormProps) {
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
        <Input label="Name" name="name" required defaultValue={vendor?.name} placeholder="Supplier or contact name" />
        <Input label="Company Name (optional)" name="companyName" defaultValue={vendor?.companyName} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Contact Person (optional)" name="contactPerson" defaultValue={vendor?.contactPerson} />
        <Input label="Phone" name="phone" required defaultValue={vendor?.phone} placeholder="+880 1XXX-XXXXXX" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Email (optional)" name="email" type="email" defaultValue={vendor?.email} />
        <Input label="Address (optional)" name="address" defaultValue={vendor?.address} />
      </div>

      <Input
        label="Categories (comma-separated)"
        name="categories"
        defaultValue={vendor?.categories.join(", ")}
        placeholder="e.g. Cement, Steel, Electrical"
      />

      <Input label="Business Info (optional)" name="businessInfo" defaultValue={vendor?.businessInfo} placeholder="Trade licence, registration, etc." />
      <Input label="Notes (optional)" name="notes" defaultValue={vendor?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

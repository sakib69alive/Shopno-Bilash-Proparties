"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Customer } from "@/types/customer";
import type { CustomerFormState } from "@/features/customers/actions";

export interface CustomerFormProps {
  action: (state: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  customer?: Customer;
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

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export function CustomerForm({ action, customer, submitLabel }: CustomerFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={customer?.name} placeholder="Full name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" required defaultValue={customer?.email} placeholder="you@example.com" />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={customer?.status} placeholder="Choose a status" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Phone" name="phone" required defaultValue={customer?.phone} placeholder="+880 1XXX-XXXXXX" />
        <Input label="Alternate Phone (optional)" name="alternatePhone" defaultValue={customer?.alternatePhone} />
      </div>

      <Input
        label="NID / Passport Number (optional)"
        name="nidOrPassportNumber"
        defaultValue={customer?.nidOrPassportNumber}
      />

      <Textarea label="Present Address (optional)" name="presentAddress" rows={2} defaultValue={customer?.presentAddress} />
      <Textarea label="Permanent Address (optional)" name="permanentAddress" rows={2} defaultValue={customer?.permanentAddress} />
      <Textarea label="Notes (optional)" name="notes" rows={3} defaultValue={customer?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Landowner } from "@/types/landowner";
import type { LandownerFormState } from "@/features/landowners/landownerActions";

export interface LandownerFormProps {
  action: (state: LandownerFormState, formData: FormData) => Promise<LandownerFormState>;
  landowner?: Landowner;
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

export function LandownerForm({ action, landowner, submitLabel }: LandownerFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={landowner?.name} placeholder="Full name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" required defaultValue={landowner?.email} placeholder="you@example.com" />
        <Input label="Phone" name="phone" required defaultValue={landowner?.phone} placeholder="+880 1XXX-XXXXXX" />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

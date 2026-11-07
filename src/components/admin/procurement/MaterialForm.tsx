"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Material, MaterialCategory } from "@/types/procurement";
import type { MaterialFormState } from "@/features/procurement/materialActions";

export interface MaterialFormProps {
  action: (state: MaterialFormState, formData: FormData) => Promise<MaterialFormState>;
  material?: Material;
  categories: MaterialCategory[];
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

export function MaterialForm({ action, material, categories, submitLabel }: MaterialFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-lg flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={material?.name} placeholder="e.g. Cement" />

      <Select
        label="Category"
        name="categoryId"
        required
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        defaultValue={material?.categoryId}
        placeholder={categories.length > 0 ? "Choose a category" : "Add a category first"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Brand (optional)" name="brand" defaultValue={material?.brand} placeholder="e.g. Shah Cement" />
        <Input label="Unit" name="unit" required defaultValue={material?.unit} placeholder="e.g. bag, ton, sqft" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Specification (optional)" name="specification" defaultValue={material?.specification} placeholder="e.g. OPC 42.5N" />
        <Input label="Grade (optional)" name="grade" defaultValue={material?.grade} placeholder="e.g. Grade 60" />
      </div>

      <Input label="Description (optional)" name="description" defaultValue={material?.description} />

      <Input
        label="Reference Price (BDT, optional)"
        name="defaultPrice"
        type="number"
        defaultValue={material?.defaultPrice?.amount}
        helperText="A form-fill hint only — every purchase still records its own real price."
      />

      <Input label="Notes (optional)" name="notes" defaultValue={material?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

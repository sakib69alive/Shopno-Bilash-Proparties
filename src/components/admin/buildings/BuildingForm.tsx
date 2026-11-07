"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Building } from "@/types/project";
import type { BuildingFormState } from "@/features/buildings/actions";

export interface BuildingFormProps {
  action: (state: BuildingFormState, formData: FormData) => Promise<BuildingFormState>;
  building?: Building;
  projectId: string;
  submitLabel: string;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "under-construction", label: "Under Construction" },
  { value: "completed", label: "Completed" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

export function BuildingForm({ action, building, projectId, submitLabel, onSuccess }: BuildingFormProps) {
  const [state, formAction] = useActionState(async (prev: BuildingFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) onSuccess?.();
    return result;
  }, {});

  return (
    <PersistForm state={state} action={formAction} className="flex flex-col gap-5 p-5">
      <input type="hidden" name="projectId" value={projectId} />

      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Building Name" name="name" required defaultValue={building?.name} placeholder="e.g. Tower A" />
      <Input label="Code (optional)" name="code" defaultValue={building?.code} placeholder="e.g. TWR-A" />
      <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={building?.status ?? "planning"} />
      <Input label="Floor Count (estimate)" name="floorCount" type="number" defaultValue={building?.floorCount} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

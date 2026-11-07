"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Parking, ParkingType } from "@/types/parking";
import type { Building, Project } from "@/types/project";
import type { ParkingFormState } from "@/features/parking/actions";
import { PARKING_TYPE_MAP } from "@/lib/parkingTypeIcons";

export interface ParkingFormProps {
  action: (state: ParkingFormState, formData: FormData) => Promise<ParkingFormState>;
  parking?: Parking;
  projects: Project[];
  buildings: Building[];
  submitLabel: string;
  defaultProjectId?: string;
}

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "reserved", label: "Reserved" },
  { value: "unavailable", label: "Unavailable" },
];

// Shared with the Owner Portal display and the public availability summary
// (`src/lib/parkingTypeIcons.ts`) so the label wording can't drift apart.
const TYPE_OPTIONS = (Object.keys(PARKING_TYPE_MAP) as ParkingType[]).map((value) => ({
  value,
  label: PARKING_TYPE_MAP[value].label,
}));

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

export function ParkingForm({ action, parking, projects, buildings, submitLabel, defaultProjectId }: ParkingFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [projectId, setProjectId] = useState(parking?.projectId ?? defaultProjectId ?? "");

  const buildingsForProject = useMemo(() => buildings.filter((b) => b.projectId === projectId), [buildings, projectId]);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Project"
          name="projectId"
          required
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Choose a project"
        />
        <Input label="Parking Number" name="parkingNumber" required defaultValue={parking?.parkingNumber} placeholder="e.g. P-01" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Building (optional)"
          name="buildingId"
          options={buildingsForProject.map((b) => ({ value: b.id, label: b.name }))}
          defaultValue={parking?.buildingId}
          placeholder={buildingsForProject.length > 0 ? "Not tied to a specific building" : "No buildings in this project yet"}
        />
        <Input label="Zone (optional)" name="zone" defaultValue={parking?.zone} placeholder="e.g. Basement 1" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Type (optional)" name="type" options={TYPE_OPTIONS} defaultValue={parking?.type} placeholder="Not set" />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={parking?.status ?? "available"} />
      </div>

      <Input label="Value (BDT, optional)" name="value" type="number" defaultValue={parking?.value?.amount} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

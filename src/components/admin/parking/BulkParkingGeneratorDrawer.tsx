"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { generateParkingSpaces, type BulkParkingFormState } from "@/features/parking/bulkGenerate";
import { PARKING_TYPE_MAP } from "@/lib/parkingTypeIcons";
import type { Building } from "@/types/project";
import type { ParkingType } from "@/types/parking";

const TYPE_OPTIONS = (Object.keys(PARKING_TYPE_MAP) as ParkingType[]).map((value) => ({
  value,
  label: PARKING_TYPE_MAP[value].label,
}));

export interface BulkParkingGeneratorDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  buildings: Building[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Generate
    </Button>
  );
}

/** Mirrors `BulkStructureGeneratorDrawer`'s exact philosophy for Parking — every space it creates is a normal, freely editable "shell" record afterward (assign an owner, rename, delete individually). */
export function BulkParkingGeneratorDrawer({ open, onClose, projectId, buildings }: BulkParkingGeneratorDrawerProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (prev: BulkParkingFormState, formData: FormData) => {
    const result = await generateParkingSpaces(prev, formData);
    if (!result.error) router.refresh();
    return result;
  }, {});

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Generate Parking">
      <PersistForm state={state} action={formAction} className="flex flex-col gap-5 p-5">
        <input type="hidden" name="projectId" value={projectId} />
        {state.error && (
          <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">{state.error}</p>
          </div>
        )}
        {state.createdParking !== undefined && (
          <div className="bg-success-soft text-success flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">Created {state.createdParking} parking space(s). Edit any of them individually afterward.</p>
          </div>
        )}

        {buildings.length > 0 && (
          <Select
            label="Building (optional)"
            name="buildingId"
            options={buildings.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Not tied to a specific building"
          />
        )}
        <Input label="Number of Spaces" name="count" type="number" required defaultValue={10} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Number Prefix" name="prefix" required defaultValue="P" helperText="e.g. P → P-01, P-02…" />
          <Input label="Starting Number" name="startNumber" type="number" required defaultValue={1} />
        </div>
        <Select
          label="Type (optional)"
          name="type"
          options={TYPE_OPTIONS}
          placeholder="Not set — mixed, decide per space later"
          helperText="Generating both car and bike spaces? Run this twice with different prefixes (e.g. C for car, B for bike) instead of mixing types in one batch."
        />
        <p className="text-caption text-fg-subtle">
          Creates unowned, available parking spaces you can freely rename, assign, or remove individually afterward. Numbers that already exist in this
          project are skipped, never overwritten.
        </p>

        <div className="flex items-center gap-3">
          <SubmitButton />
        </div>
      </PersistForm>
    </Drawer>
  );
}

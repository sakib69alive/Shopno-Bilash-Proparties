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
import { generateFloorsAndUnits, type BulkGenerateFormState } from "@/features/floors/bulkGenerate";
import type { Building } from "@/types/project";

export interface BulkStructureGeneratorDrawerProps {
  open: boolean;
  onClose: () => void;
  buildings: Building[];
}

const NAMING_OPTIONS = [
  { value: "letters", label: "A, B, C…" },
  { value: "numbers", label: "1, 2, 3…" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Generate
    </Button>
  );
}

/**
 * A convenience generator, not an enforced structure — every floor/unit it
 * creates is a normal, freely editable record afterward. Real buildings
 * are irregular, so this only saves the repetitive part of a typical case.
 */
export function BulkStructureGeneratorDrawer({ open, onClose, buildings }: BulkStructureGeneratorDrawerProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (prev: BulkGenerateFormState, formData: FormData) => {
    const result = await generateFloorsAndUnits(prev, formData);
    if (!result.error) router.refresh();
    return result;
  }, {});

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Generate Structure">
      <PersistForm state={state} action={formAction} className="flex flex-col gap-5 p-5">
        {state.error && (
          <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">{state.error}</p>
          </div>
        )}
        {state.createdFloors !== undefined && (
          <div className="bg-success-soft text-success flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">
              Created {state.createdFloors} floor(s) and {state.createdUnits} unit(s). Edit any of them individually afterward.
            </p>
          </div>
        )}

        <Select
          label="Building"
          name="buildingId"
          required
          options={buildings.map((b) => ({ value: b.id, label: b.name }))}
          placeholder={buildings.length > 0 ? "Choose a building" : "Add a building first"}
        />
        <Input label="Starting Floor Number" name="startFloorNumber" type="number" required defaultValue={1} />
        <Input label="Number of Floors" name="floorCount" type="number" required defaultValue={10} />
        <Input label="Units per Floor" name="unitsPerFloor" type="number" required defaultValue={3} />
        <Select label="Unit Naming" name="namingPattern" required options={NAMING_OPTIONS} defaultValue="letters" />
        <p className="text-caption text-fg-subtle">
          Real buildings are often irregular — this creates a starting structure you can freely edit, rename, or remove floor by floor afterward.
        </p>

        <div className="flex items-center gap-3">
          <SubmitButton />
        </div>
      </PersistForm>
    </Drawer>
  );
}

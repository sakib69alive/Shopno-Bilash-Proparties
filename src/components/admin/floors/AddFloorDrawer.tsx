"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createFloor, type FloorFormState } from "@/features/floors/actions";

export interface AddFloorDrawerProps {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  nextFloorNumber: number;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Add Floor
    </Button>
  );
}

export function AddFloorDrawer({ open, onClose, buildingId, nextFloorNumber }: AddFloorDrawerProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (prev: FloorFormState, formData: FormData) => {
    const result = await createFloor(prev, formData);
    if (!result.error) {
      onClose();
      router.refresh();
    }
    return result;
  }, {});

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Add Floor">
      <PersistForm state={state} action={formAction} className="flex flex-col gap-5 p-5">
        <input type="hidden" name="buildingId" value={buildingId} />

        {state.error && (
          <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">{state.error}</p>
          </div>
        )}

        <Input label="Floor Label" name="label" required defaultValue={`Floor ${nextFloorNumber}`} placeholder="e.g. Floor 1" />
        <Input label="Floor Number" name="floorNumber" type="number" required defaultValue={nextFloorNumber} />

        <div className="flex items-center gap-3">
          <SubmitButton />
        </div>
      </PersistForm>
    </Drawer>
  );
}

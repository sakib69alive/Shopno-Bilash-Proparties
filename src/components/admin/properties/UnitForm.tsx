"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Unit } from "@/types/unit";
import type { Building, Floor, Project } from "@/types/project";
import { matchUnitType } from "@/lib/unitPlan";
import type { UnitFormState } from "@/features/units/actions";

export interface UnitFormProps {
  action: (state: UnitFormState, formData: FormData) => Promise<UnitFormState>;
  unit?: Unit;
  projects: Project[];
  buildings: Building[];
  floors: Floor[];
  submitLabel: string;
  /** Presets the project when arriving from a specific project's workspace (e.g. the bulk generator or "Add Unit" CTA). */
  defaultProjectId?: string;
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
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "booked", label: "Booked" },
  { value: "sold", label: "Sold" },
  { value: "allocated", label: "Allocated" },
  { value: "on-hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const FACING_OPTIONS = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "north-east", label: "North-East" },
  { value: "north-west", label: "North-West" },
  { value: "south-east", label: "South-East" },
  { value: "south-west", label: "South-West" },
];

/** Cascading Project → Building → Floor — Building/Floor are now real entities (Chapter 2 Prompt 2), no more free-text identifiers. */
export function UnitForm({ action, unit, projects, buildings, floors, submitLabel, defaultProjectId }: UnitFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [projectId, setProjectId] = useState(unit?.projectId ?? defaultProjectId ?? "");
  const [buildingId, setBuildingId] = useState(unit?.buildingId ?? "");
  const [unitNumber, setUnitNumber] = useState(unit?.unitNumber ?? "");
  const [unitTypeId, setUnitTypeId] = useState(unit?.unitTypeId ?? "");
  const [floorId, setFloorId] = useState(unit?.floorId ?? "");

  const buildingsForProject = useMemo(() => buildings.filter((b) => b.projectId === projectId), [buildings, projectId]);
  const projectTypes = useMemo(() => projects.find((p) => p.id === projectId)?.unitTypes ?? [], [projects, projectId]);
  const floorNumber = floors.find((f) => f.id === floorId)?.floorNumber;
  const autoType = unitTypeId ? undefined : matchUnitType(unitNumber, projectTypes, floorNumber);
  const floorsForBuilding = useMemo(() => floors.filter((f) => f.buildingId === buildingId), [floors, buildingId]);

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
          onChange={(e) => {
            setProjectId(e.target.value);
            setBuildingId("");
          }}
          placeholder="Choose a project"
        />
        <Input
          label="Unit Number"
          name="unitNumber"
          required
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          placeholder="e.g. 3A"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {buildingsForProject.length === 0 ? (
          <p className="text-body-sm text-fg-subtle sm:col-span-2">
            {projectId ? "This project has no buildings yet — add one from its workspace's Units tab first." : "Choose a project first."}
          </p>
        ) : (
          <>
            <Select
              label="Building"
              name="buildingId"
              required
              options={buildingsForProject.map((b) => ({ value: b.id, label: b.name }))}
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              placeholder="Choose a building"
            />
            {buildingId && floorsForBuilding.length === 0 ? (
              <p className="text-body-sm text-fg-subtle self-end">This building has no floors yet — add one first.</p>
            ) : (
              <Select
                label="Floor"
                name="floorId"
                required
                options={floorsForBuilding.map((f) => ({ value: f.id, label: f.label }))}
                value={floorId}
                onChange={(e) => setFloorId(e.target.value)}
                placeholder="Choose a floor"
              />
            )}
          </>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={unit?.status} placeholder="Choose a status" />
        <Select label="Facing (optional)" name="facing" options={FACING_OPTIONS} defaultValue={unit?.facing} placeholder="Not set" />
      </div>

      <div className="grid gap-5 sm:grid-cols-4">
        <Input label="Size (sqft)" name="sizeSqft" type="number" required defaultValue={unit?.sizeSqft} />
        <Input
          label="Allocation Ratio (optional override)"
          name="allocationRatio"
          type="number"
          step="0.0001"
          defaultValue={unit?.allocationRatio}
          helperText="Leave blank to use an area-proportional share."
        />
        <Input label="Bedrooms" name="bedrooms" type="number" defaultValue={unit?.bedrooms} />
        <Input label="Bathrooms" name="bathrooms" type="number" defaultValue={unit?.bathrooms} />
        <Input label="Balconies" name="balconies" type="number" defaultValue={unit?.balconies} />
      </div>

      <Input label="Parking Spaces" name="parkingSpaces" type="number" defaultValue={unit?.parkingSpaces} />

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Design</h2>
      <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
        <p className="text-body-sm text-fg-muted">
          <b>Blueprint.</b> This flat uses its project&rsquo;s shared blueprint type. Pick one below, or leave it on automatic to match by the
          flat code (e.g. 3A → the type with code A). If this flat&rsquo;s design is different, upload a custom blueprint — that one wins.
        </p>
        {projectTypes.length > 0 ? (
          <Select
            label="Blueprint type"
            name="unitTypeId"
            options={[{ value: "", label: autoType ? `Automatic — ${autoType.name}` : "Automatic (by flat code)" }, ...projectTypes.map((t) => ({ value: t.id, label: t.name }))]}
            value={unitTypeId}
            onChange={(e) => setUnitTypeId(e.target.value)}
          />
        ) : (
          <p className="text-body-sm text-fg-subtle">
            {projectId ? "This project has no blueprint types yet — add them from the project’s edit page to reuse one design across flats." : "Choose a project first."}
          </p>
        )}
        <Input
          label="Custom blueprint for this flat (optional)"
          name="layoutImage"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
          helperText={unit?.layoutImage ? "This flat has its own custom blueprint. Choose a file to replace it." : "JPG, PNG, WEBP or SVG — either one works. Upload only the layout drawing: no background, border or page colour. Overrides the blueprint type."}
        />
        {unit?.layoutImage && (
          <label className="text-body-sm flex items-center gap-2">
            <input type="checkbox" name="removeLayoutImage" className="size-4" />
            Remove the custom blueprint (use the blueprint type instead)
          </label>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Gallery Images"
          name="gallery"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          helperText={
            unit && (unit.galleryImages?.length ?? 0) > 0
              ? `${unit.galleryImages!.length} image(s) already in the gallery — new ones are added, not replaced.`
              : "This unit's own design may differ from others — add its specific photos here."
          }
        />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Pricing (BDT)</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Base Price" name="basePrice" type="number" required defaultValue={unit?.basePrice.amount} />
        <Input label="Additional Charges" name="additionalCharges" type="number" defaultValue={unit?.additionalCharges.amount} />
        <Input label="Discount" name="discount" type="number" defaultValue={unit?.discount.amount} />
      </div>
      <p className="text-caption text-fg-subtle -mt-3">Final price is calculated automatically (base + additional − discount).</p>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

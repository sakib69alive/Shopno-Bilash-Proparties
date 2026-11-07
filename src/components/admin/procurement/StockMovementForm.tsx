"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Material, StockMovementType } from "@/types/procurement";
import type { Project, Building, Floor } from "@/types/project";
import type { Unit } from "@/types/unit";
import type { ConstructionPhase } from "@/types/construction";
import type { StockMovementFormState } from "@/features/procurement/stockMovementActions";

export interface StockMovementFormProps {
  action: (state: StockMovementFormState, formData: FormData) => Promise<StockMovementFormState>;
  projects: Project[];
  materials: Material[];
  buildings: Building[];
  floors: Floor[];
  units: Unit[];
  constructionPhases: ConstructionPhase[];
  defaultProjectId?: string;
}

const TYPE_OPTIONS = [
  { value: "opening", label: "Opening Stock" },
  { value: "received", label: "Received" },
  { value: "used", label: "Used" },
  { value: "wastage", label: "Wastage" },
  { value: "adjustment", label: "Adjustment (+/-)" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Record Movement
    </Button>
  );
}

/**
 * "Used"/"Wastage" movements can optionally carry construction context
 * (Building → Floor → Unit, a Construction Phase, free-text activity/
 * contractor) — never required, since some activities apply to the whole
 * project rather than one location. Every select is scoped to the currently
 * chosen project, mirroring the cascading pattern already in `UnitForm.tsx`.
 */
export function StockMovementForm({ action, projects, materials, buildings, floors, units, constructionPhases, defaultProjectId }: StockMovementFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [type, setType] = useState<StockMovementType | "">("");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [showContext, setShowContext] = useState(false);

  const isUsageType = type === "used" || type === "wastage";
  const buildingsForProject = useMemo(() => buildings.filter((b) => b.projectId === projectId), [buildings, projectId]);
  const floorsForBuilding = useMemo(() => floors.filter((f) => f.buildingId === buildingId), [floors, buildingId]);
  const unitsForFloor = useMemo(() => units.filter((u) => u.floorId === floorId), [units, floorId]);
  const phasesForProject = useMemo(() => constructionPhases.filter((p) => p.projectId === projectId), [constructionPhases, projectId]);

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
            setFloorId("");
          }}
          placeholder={projects.length > 0 ? "Choose a project" : "No projects yet"}
        />
        <Select
          label="Material"
          name="materialId"
          required
          options={materials.map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` }))}
          placeholder={materials.length > 0 ? "Choose a material" : "Add a material first"}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Type"
          name="type"
          required
          options={TYPE_OPTIONS}
          value={type}
          onChange={(e) => setType(e.target.value as StockMovementType)}
          placeholder="Choose a movement type"
        />
        <Input label="Quantity" name="quantity" type="number" required helperText="Positive, except Adjustment which can be negative." />
      </div>

      <Input label="Date" name="date" type="date" required />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Reference (optional)" name="reference" placeholder="e.g. Invoice BBM-2026-0817" />
        <Input label="Notes (optional)" name="notes" />
      </div>

      {isUsageType && (
        <div className="border-border flex flex-col gap-4 rounded-lg border p-4">
          <button
            type="button"
            onClick={() => setShowContext((v) => !v)}
            className="text-body-sm text-fg flex items-center justify-between font-medium"
          >
            Construction Context (optional)
            <ChevronDown aria-hidden className={`size-4 transition-transform ${showContext ? "rotate-180" : ""}`} />
          </button>
          {showContext && (
            <div className="flex flex-col gap-4">
              <p className="text-caption text-fg-subtle">
                Only fill in what applies — a project-wide activity needs none of these; a specific floor&apos;s usage can carry as much detail as helpful.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  label="Building"
                  name="buildingId"
                  options={buildingsForProject.map((b) => ({ value: b.id, label: b.name }))}
                  value={buildingId}
                  onChange={(e) => {
                    setBuildingId(e.target.value);
                    setFloorId("");
                  }}
                  placeholder="Not specified"
                />
                <Select
                  label="Floor"
                  name="floorId"
                  options={floorsForBuilding.map((f) => ({ value: f.id, label: f.label }))}
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  placeholder="Not specified"
                  disabled={!buildingId}
                />
                <Select
                  label="Unit"
                  name="unitId"
                  options={unitsForFloor.map((u) => ({ value: u.id, label: u.unitNumber }))}
                  placeholder="Not specified"
                  disabled={!floorId}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Construction Phase (optional)"
                  name="constructionPhaseId"
                  options={phasesForProject.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Not specified"
                />
                <Input label="Activity (optional)" name="activity" placeholder="e.g. Roof Casting" />
              </div>
              <Input label="Contractor/Team (optional)" name="contractorTeam" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </PersistForm>
  );
}

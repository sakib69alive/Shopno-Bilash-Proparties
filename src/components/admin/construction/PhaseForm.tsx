"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ConstructionPhase, ProgressTrackingMethod } from "@/types/construction";
import type { Project, Building, Floor } from "@/types/project";
import type { Unit } from "@/types/unit";
import type { Contractor } from "@/types/contractor";
import type { PhaseFormState } from "@/features/construction/phaseActions";

export interface PhaseFormProps {
  action: (state: PhaseFormState, formData: FormData) => Promise<PhaseFormState>;
  phase?: ConstructionPhase;
  projects: Project[];
  buildings: Building[];
  floors: Floor[];
  units: Unit[];
  contractors: Contractor[];
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
  { value: "not-started", label: "Not Started" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const TRACKING_METHOD_OPTIONS: { value: ProgressTrackingMethod; label: string }[] = [
  { value: "manual", label: "Manual %" },
  { value: "quantity", label: "Quantity-based" },
  { value: "task", label: "Task-based" },
  { value: "milestone", label: "Milestone-based" },
];

export function PhaseForm({ action, phase, projects, buildings, floors, units, contractors, submitLabel }: PhaseFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [projectId, setProjectId] = useState(phase?.projectId ?? "");
  const [buildingId, setBuildingId] = useState(phase?.buildingId ?? "");
  const [floorId, setFloorId] = useState(phase?.floorId ?? "");
  const [trackingMethod, setTrackingMethod] = useState<ProgressTrackingMethod>(phase?.trackingMethod ?? "manual");

  const buildingsForProject = useMemo(() => buildings.filter((b) => b.projectId === projectId), [buildings, projectId]);
  const floorsForBuilding = useMemo(() => floors.filter((f) => f.buildingId === buildingId), [floors, buildingId]);
  const unitsForFloor = useMemo(() => units.filter((u) => u.floorId === floorId), [units, floorId]);
  const activeContractors = useMemo(() => contractors.filter((c) => c.status !== "inactive" || c.id === phase?.contractorId), [contractors, phase]);

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
          placeholder={projects.length > 0 ? "Choose a project" : "No projects yet — add one first"}
        />
        <Input label="Phase Name" name="name" required defaultValue={phase?.name} placeholder="e.g. Foundation" />
      </div>

      <Input label="Description (optional)" name="description" defaultValue={phase?.description} />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Order" name="order" type="number" required defaultValue={phase?.order} placeholder="e.g. 1" />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={phase?.status} placeholder="Choose a status" />
        <Select label="Priority (optional)" name="priority" options={PRIORITY_OPTIONS} defaultValue={phase?.priority} placeholder="Not set" />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Schedule</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Planned Start (optional)" name="startDate" type="date" defaultValue={phase?.startDate} />
        <Input label="Planned Target End (optional)" name="endDate" type="date" defaultValue={phase?.endDate} helperText="Use “Revise Schedule” later to change this with a reason on record." />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Actual Start (optional)" name="actualStartDate" type="date" defaultValue={phase?.actualStartDate} />
        <Input label="Actual End (optional)" name="actualEndDate" type="date" defaultValue={phase?.actualEndDate} helperText="Set once the phase genuinely finishes." />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Progress Tracking</h2>
      <Select
        label="Tracking Method"
        name="trackingMethod"
        required
        options={TRACKING_METHOD_OPTIONS}
        value={trackingMethod}
        onChange={(e) => setTrackingMethod(e.target.value as ProgressTrackingMethod)}
      />
      {trackingMethod === "manual" && (
        <Input label="Progress %" name="progressPercentage" type="number" required defaultValue={phase?.progressPercentage} />
      )}
      {trackingMethod === "quantity" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Quantity Planned" name="quantityPlanned" type="number" defaultValue={phase?.quantityPlanned} placeholder="e.g. 100 piles" />
          <Input label="Quantity Completed" name="quantityCompleted" type="number" defaultValue={phase?.quantityCompleted} />
        </div>
      )}
      {(trackingMethod === "task" || trackingMethod === "milestone") && (
        <p className="text-body-sm text-fg-subtle">
          Progress is computed automatically from {trackingMethod === "task" ? "this phase's tasks" : "linked milestones"} once saved.
        </p>
      )}
      {/* Manual progressPercentage is still submitted even in the other modes, since it's the stored fallback the type always requires. */}
      {trackingMethod !== "manual" && <input type="hidden" name="progressPercentage" value={phase?.progressPercentage ?? 0} />}

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Contractor &amp; Cost</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Contractor (optional)"
          name="contractorId"
          options={activeContractors.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={phase?.contractorId}
          placeholder="Not assigned"
        />
        <Input
          label="Contractor Name — free text (optional)"
          name="contractorName"
          defaultValue={phase?.contractorName}
          placeholder="Only if no Contractor record exists yet"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Estimated Cost, BDT (optional)" name="estimatedCost" type="number" defaultValue={phase?.estimatedCost?.amount} />
        <Input
          label="Weight, % (optional)"
          name="weight"
          type="number"
          defaultValue={phase?.weight}
          helperText="Set on every phase to switch overall progress to weighted."
        />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Scope (optional — leave blank for project-wide)</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          label="Building"
          name="buildingId"
          options={buildingsForProject.map((b) => ({ value: b.id, label: b.name }))}
          value={buildingId}
          onChange={(e) => {
            setBuildingId(e.target.value);
            setFloorId("");
          }}
          placeholder="Whole project"
        />
        <Select
          label="Floor"
          name="floorId"
          options={floorsForBuilding.map((f) => ({ value: f.id, label: f.label }))}
          value={floorId}
          onChange={(e) => setFloorId(e.target.value)}
          placeholder="Whole building"
          disabled={!buildingId}
        />
        <Select
          label="Unit"
          name="unitId"
          options={unitsForFloor.map((u) => ({ value: u.id, label: u.unitNumber }))}
          defaultValue={phase?.unitId}
          placeholder="Whole floor"
          disabled={!floorId}
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

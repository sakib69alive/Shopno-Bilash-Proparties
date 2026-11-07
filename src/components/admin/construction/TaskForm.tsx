"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { ConstructionTask } from "@/types/construction";
import type { User } from "@/types/user";
import type { Building, Floor } from "@/types/project";
import type { Contractor } from "@/types/contractor";
import type { TaskFormState } from "@/features/construction/taskActions";

export interface TaskFormProps {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  phaseId: string;
  task?: ConstructionTask;
  users: User[];
  buildings: Building[];
  floors: Floor[];
  contractors: Contractor[];
  /** Other tasks in the same phase — candidates for `dependsOnTaskIds`, excluding this task itself. */
  otherTasks: ConstructionTask[];
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

export function TaskForm({ action, phaseId, task, users, buildings, floors, contractors, otherTasks, submitLabel }: TaskFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [buildingId, setBuildingId] = useState(task?.buildingId ?? "");
  const [dependsOn, setDependsOn] = useState<Set<string>>(new Set(task?.dependsOnTaskIds ?? []));

  const floorsForBuilding = floors.filter((f) => f.buildingId === buildingId);

  function toggleDependency(taskId: string) {
    setDependsOn((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <input type="hidden" name="phaseId" value={phaseId} />
      <input type="hidden" name="dependsOnTaskIds" value={[...dependsOn].join(",")} />

      <Input label="Task Title" name="title" required defaultValue={task?.title} placeholder="e.g. Pour foundation slab" />
      <Input label="Description (optional)" name="description" defaultValue={task?.description} />

      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          label="Responsible (optional)"
          name="responsibleUserId"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={task?.responsibleUserId}
          placeholder="Unassigned"
        />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={task?.status} placeholder="Choose a status" />
        <Select label="Priority (optional)" name="priority" options={PRIORITY_OPTIONS} defaultValue={task?.priority} placeholder="Not set" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Contractor (optional)"
          name="contractorId"
          options={contractors.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={task?.contractorId}
          placeholder="Not assigned"
        />
        <Input label="Estimated Cost, BDT (optional)" name="estimatedCost" type="number" defaultValue={task?.estimatedCost?.amount} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Building (optional)"
          name="buildingId"
          options={buildings.map((b) => ({ value: b.id, label: b.name }))}
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          placeholder="Whole project"
        />
        <Select
          label="Floor (optional)"
          name="floorId"
          options={floorsForBuilding.map((f) => ({ value: f.id, label: f.label }))}
          defaultValue={task?.floorId}
          placeholder="Whole building"
          disabled={!buildingId}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Start Date (optional)" name="startDate" type="date" defaultValue={task?.startDate} />
        <Input label="Due Date (optional)" name="endDate" type="date" defaultValue={task?.endDate} />
        <Input label="Completion Date (optional)" name="completionDate" type="date" defaultValue={task?.completionDate} />
      </div>

      <Input label="Progress % (optional)" name="progressPercentage" type="number" defaultValue={task?.progressPercentage} />

      {otherTasks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-fg-muted">Depends On (optional)</label>
          <div className="border-border-strong flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2">
            {otherTasks.map((t) => (
              <label key={t.id} className="text-body-sm text-fg flex items-center gap-2 rounded px-2 py-1 hover:bg-surface">
                <input type="checkbox" checked={dependsOn.has(t.id)} onChange={() => toggleDependency(t.id)} />
                {t.title}
              </label>
            ))}
          </div>
          <p className="text-caption text-fg-subtle">Shown as a warning if incomplete — never blocks marking this task done.</p>
        </div>
      )}

      <Textarea label="Notes (optional)" name="notes" rows={3} defaultValue={task?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ProjectBudget } from "@/types/finance/project";
import type { Project } from "@/types/project";
import type { ConstructionPhase } from "@/types/construction";
import type { ProjectBudgetFormState } from "@/features/finance/projectBudgetActions";

export interface ProjectBudgetFormProps {
  action: (state: ProjectBudgetFormState, formData: FormData) => Promise<ProjectBudgetFormState>;
  budget?: ProjectBudget;
  projects: Project[];
  phases: ConstructionPhase[];
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

export function ProjectBudgetForm({ action, budget, projects, phases, submitLabel }: ProjectBudgetFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [projectId, setProjectId] = useState(budget?.projectId ?? "");
  const phasesForProject = useMemo(() => phases.filter((p) => p.projectId === projectId), [phases, projectId]);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Select
        label="Project"
        name="projectId"
        required
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        placeholder={projects.length > 0 ? "Choose a project" : "No projects yet — add one first"}
      />

      {phasesForProject.length > 0 && (
        <Select
          label="Construction Stage (optional)"
          name="phaseId"
          options={phasesForProject.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={budget?.phaseId}
          placeholder="Project-level (not tied to one stage)"
        />
      )}

      <Input label="Category" name="category" required defaultValue={budget?.category} placeholder="e.g. Materials, Labor, Permits" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Budgeted (BDT)" name="budgeted" type="number" required defaultValue={budget?.budgeted.amount} />
        <Input
          label="Actual — Manual Entry (BDT)"
          name="actual"
          type="number"
          required
          defaultValue={budget?.actual.amount ?? 0}
          helperText="Typed by you, not calculated. The real live actual cost (from Purchases, Expenses, and Contractor Payments) is on the project's Reports tab — update this to match if they should agree."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Date" name="date" type="date" required defaultValue={budget?.date} />
        <Input label="Reference (optional)" name="reference" defaultValue={budget?.reference} placeholder="e.g. Approval memo number" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Warning Threshold % (optional)"
          name="warningThresholdPct"
          type="number"
          defaultValue={budget?.warningThresholdPct ?? 80}
          helperText="Utilization at or above this reads as On Budget (cautionary)."
        />
        <Input
          label="Over Threshold % (optional)"
          name="overThresholdPct"
          type="number"
          defaultValue={budget?.overThresholdPct ?? 100}
          helperText="Utilization at or above this reads as Over Budget."
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

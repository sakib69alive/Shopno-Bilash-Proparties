"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Shareholding } from "@/types/shareholder";
import type { Project } from "@/types/project";
import type { ShareholdingFormState } from "@/features/shareholders/shareholdingActions";

export interface ShareholdingFormProps {
  action: (state: ShareholdingFormState, formData: FormData) => Promise<ShareholdingFormState>;
  shareholderId: string;
  holding?: Shareholding;
  projects: Project[];
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

export function ShareholdingForm({ action, shareholderId, holding, projects, submitLabel }: ShareholdingFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <input type="hidden" name="shareholderId" value={shareholderId} />

      <Select
        label="Project"
        name="projectId"
        required
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        defaultValue={holding?.projectId}
        placeholder={projects.length > 0 ? "Choose a project" : "No projects yet — add one first"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Share Percentage" name="sharePercentage" type="number" step="0.01" required defaultValue={holding?.sharePercentage} placeholder="e.g. 15" />
        <Input label="Total Contribution (BDT)" name="totalContribution" type="number" required defaultValue={holding?.totalContribution.amount} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

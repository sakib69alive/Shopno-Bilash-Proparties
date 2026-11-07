"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Agreement } from "@/types/landowner";
import type { Project } from "@/types/project";
import type { AgreementFormState } from "@/features/landowners/agreementActions";

export interface AgreementFormProps {
  action: (state: AgreementFormState, formData: FormData) => Promise<AgreementFormState>;
  landownerId: string;
  agreement?: Agreement;
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

const STATUS_OPTIONS = [
  { value: "proposed", label: "Proposed" },
  { value: "under-review", label: "Under Review" },
  { value: "signed", label: "Signed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "terminated", label: "Terminated" },
];

export function AgreementForm({ action, landownerId, agreement, projects, submitLabel }: AgreementFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <input type="hidden" name="landownerId" value={landownerId} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Project (optional)"
          name="projectId"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={agreement?.projectId}
          placeholder={projects.length > 0 ? "Not linked to a project yet" : "No projects yet"}
        />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={agreement?.status} placeholder="Choose a status" />
      </div>

      <Textarea
        label="Terms Summary"
        name="termsSummary"
        required
        rows={3}
        defaultValue={agreement?.termsSummary}
        placeholder="e.g. Landowner receives 35% of built units"
      />

      <Input label="Signed Date (optional)" name="signedDate" type="date" defaultValue={agreement?.signedDate} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

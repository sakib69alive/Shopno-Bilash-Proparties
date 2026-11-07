"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Reminder } from "@/types/reminder";
import type { Project } from "@/types/project";
import type { User } from "@/types/user";
import type { ReminderFormState } from "@/features/reminders/actions";

export interface ReminderFormProps {
  action: (state: ReminderFormState, formData: FormData) => Promise<ReminderFormState>;
  reminder?: Reminder;
  projects: Project[];
  users: User[];
  submitLabel: string;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const REPEAT_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

export function ReminderForm({ action, reminder, projects, users, submitLabel }: ReminderFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Title" name="title" required defaultValue={reminder?.title} placeholder="e.g. Follow up with Rafiq Ahmed" />
      <Textarea label="Description (optional)" name="description" rows={2} defaultValue={reminder?.description} />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Date" name="date" type="date" required defaultValue={reminder?.date} />
        <Input label="Time (optional)" name="time" type="time" defaultValue={reminder?.time} />
        <Select label="Priority" name="priority" required options={PRIORITY_OPTIONS} defaultValue={reminder?.priority ?? "medium"} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Project (optional)"
          name="projectId"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={reminder?.projectId}
          placeholder="Not tied to a project"
        />
        <Select
          label="Assigned To (optional)"
          name="assignedUserId"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={reminder?.assignedUserId}
          placeholder="Unassigned"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Related Entity (optional)" name="relatedEntity" defaultValue={reminder?.relatedEntity} placeholder="e.g. Installment — Unit 4C" />
        <Select label="Repeat" name="repeatRule" options={REPEAT_OPTIONS} defaultValue={reminder?.repeatRule ?? "none"} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

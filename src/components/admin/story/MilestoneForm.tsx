"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { MILESTONE_ICON_MAP } from "@/lib/milestoneIcons";
import type { MilestoneFormState } from "@/features/companyMilestones/actions";
import type { CompanyMilestone, MilestoneIconKey } from "@/types/companyMilestone";

export interface MilestoneFormProps {
  action: (state: MilestoneFormState, formData: FormData) => Promise<MilestoneFormState>;
  milestone?: CompanyMilestone;
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

const ICON_OPTIONS = (Object.keys(MILESTONE_ICON_MAP) as MilestoneIconKey[]).map((key) => ({
  value: key,
  label: MILESTONE_ICON_MAP[key].label,
}));

/** Shared by the create/edit admin pages for a single "Our Story" timeline entry. */
export function MilestoneForm({ action, milestone, submitLabel }: MilestoneFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Year"
          name="year"
          required
          defaultValue={milestone?.year}
          placeholder="e.g. 2026"
          helperText="4-digit year — entries are ordered on the timeline automatically."
        />
        <Select label="Icon" name="icon" required options={ICON_OPTIONS} defaultValue={milestone?.icon} placeholder="Choose an icon" />
      </div>

      <Input label="Title" name="title" required defaultValue={milestone?.title} placeholder="e.g. Company Founded" />

      <Textarea
        label="Summary"
        name="summary"
        required
        rows={2}
        defaultValue={milestone?.summary}
        placeholder="One sentence, shown directly on the timeline."
      />

      <Textarea
        label="Details (optional)"
        name="details"
        rows={5}
        defaultValue={milestone?.details}
        placeholder="The full story behind this milestone — shown when a visitor clicks &ldquo;Read More&rdquo;."
        helperText="Leave empty and the &ldquo;Read More&rdquo; link won't be shown for this entry."
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

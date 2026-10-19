"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { AdminImageField } from "@/components/admin/settings/AdminImageField";
import type { TeamMember } from "@/types/teamMember";
import type { TeamMemberFormState } from "@/features/teamMembers/actions";

export interface TeamMemberFormProps {
  action: (state: TeamMemberFormState, formData: FormData) => Promise<TeamMemberFormState>;
  member?: TeamMember;
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

/** Shared by the create and edit admin pages for a single partner/team member. */
export function TeamMemberForm({ action, member, submitLabel }: TeamMemberFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" required defaultValue={member?.name} placeholder="e.g. Nusrat Jahan" />
        <Input label="Title / Role" name="title" required defaultValue={member?.title} placeholder="e.g. Partner & Director of Sales" />
      </div>

      <AdminImageField
        label={member?.photo ? "Replace Photo (optional)" : "Photo (optional)"}
        name="photo"
        removeName="photo-remove"
        currentSrc={member?.photo}
        helperText="JPG, PNG or WEBP, up to 15MB. Shown on the public Founder page's team grid."
      />

      <Textarea
        label="Short Bio (optional)"
        name="bio"
        rows={3}
        defaultValue={member?.bio}
        placeholder="One or two sentences — their role and focus at the company."
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

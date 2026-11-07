"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Lead } from "@/types/crm";
import type { Project } from "@/types/project";
import type { Unit } from "@/types/unit";
import type { User } from "@/types/user";
import type { LeadFormState } from "@/features/crm/actions";

export interface LeadFormProps {
  action: (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  lead?: Lead;
  projects: Project[];
  units: Unit[];
  users: User[];
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
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "interested", label: "Interested" },
  { value: "site-visit", label: "Site Visit" },
  { value: "negotiation", label: "Negotiation" },
  { value: "booking", label: "Booking" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

/** Prompt 8 §2 defaults — suggestions only, `source` stays free text so a lead source outside this list is still valid. */
const DEFAULT_LEAD_SOURCES = ["Website", "Facebook", "Instagram", "Referral", "Walk-in", "Phone", "Advertisement", "Broker", "Other"];

export function LeadForm({ action, lead, projects, units, users, submitLabel }: LeadFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={lead?.name} placeholder="Full name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Phone" name="phone" required defaultValue={lead?.phone} placeholder="+880 1XXX-XXXXXX" />
        <Input label="Email (optional)" name="email" type="email" defaultValue={lead?.email} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lead-source" className="text-label text-fg-muted">
            Source
          </label>
          <input
            id="lead-source"
            name="source"
            list="lead-source-options"
            required
            defaultValue={lead?.source}
            placeholder="e.g. Website, Referral, Walk-in"
            className="text-body h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3.5 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <datalist id="lead-source-options">
            {DEFAULT_LEAD_SOURCES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={lead?.status} placeholder="Choose a status" />
        <Select label="Priority (optional)" name="priority" options={PRIORITY_OPTIONS} defaultValue={lead?.priority} placeholder="Not set" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Interested Project (optional)"
          name="interestedProjectId"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={lead?.interestedProjectId}
          placeholder={projects.length > 0 ? "None noted" : "No projects yet"}
        />
        <Select
          label="Interested Unit (optional)"
          name="interestedUnitId"
          options={units.map((u) => ({ value: u.id, label: u.unitNumber }))}
          defaultValue={lead?.interestedUnitId}
          placeholder={units.length > 0 ? "None noted" : "No units yet"}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Assigned To (optional)"
          name="assignedSalespersonId"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={lead?.assignedSalespersonId}
          placeholder="Unassigned"
        />
        <Input label="Budget (BDT, optional)" name="budget" type="number" defaultValue={lead?.budget?.amount} />
      </div>

      <Input label="Next Follow-up (optional)" name="nextFollowUpAt" type="date" defaultValue={lead?.nextFollowUpAt} />

      <Textarea label="Notes (optional)" name="notes" rows={3} defaultValue={lead?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

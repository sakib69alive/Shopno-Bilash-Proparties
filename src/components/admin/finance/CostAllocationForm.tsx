"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/types/project";
import type { CostAllocationFormState } from "@/features/costAllocations/actions";
import type { AllocationMethod } from "@/types/finance/costAllocation";

export interface CostAllocationFormProps {
  action: (state: CostAllocationFormState, formData: FormData) => Promise<CostAllocationFormState>;
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

const FINE_TYPE_OPTIONS = [
  { value: "flat", label: "Flat amount (BDT)" },
  { value: "percentage", label: "Percentage of outstanding" },
];

const ALLOCATION_METHOD_OPTIONS: { value: AllocationMethod; label: string }[] = [
  { value: "custom", label: "Pick flats — you choose who pays and how (recommended)" },
  { value: "sqft", label: "Everyone by area, automatically" },
  { value: "unit-ratio", label: "Predefined unit ratio" },
  { value: "tier", label: "Tiered groups" },
];

/**
 * Four plain questions — which project, what is it for, how much, pay by
 * when. Everything else (fine for late payment, category, method…) has a
 * sensible default and sits under "More options". Who pays how much is
 * decided on the next screen, with a live picture of the result.
 */
export function CostAllocationForm({ action, projects, submitLabel }: CostAllocationFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>("custom");
  const parkingEligible = allocationMethod === "custom" || allocationMethod === "tier";

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <p className="text-body text-fg-muted">
        Tell us what the money is for. On the next screen you choose which flats pay, and see how much each one pays before anything is sent.
      </p>

      <Select
        label="Which project?"
        name="projectId"
        required
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        placeholder={projects.length > 0 ? "Choose a project" : "No projects yet — add one first"}
      />

      <Input label="What is this payment for?" name="title" required placeholder="e.g. Piling — Phase 1" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Total money to collect (৳)" name="totalAmount" type="number" required placeholder="e.g. 1000000" />
        <Input label="Last date to pay" name="dueDate" type="date" required />
      </div>

      <details className="border-border bg-surface group rounded-lg border">
        <summary className="text-body-sm text-fg-muted flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium">
          More options (not needed for most budgets)
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 px-4 pt-1 pb-4">
          <Input label="Category" name="category" placeholder="Same as the name above if left empty" />
          <Input label="Date of this budget" name="allocationDate" type="date" helperText="Today if left empty." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Late fine" name="fineType" options={FINE_TYPE_OPTIONS} defaultValue="percentage" />
            <Input label="Fine value" name="fineValue" type="number" placeholder="0 = no fine" helperText="Taka if Flat, or a percent (e.g. 5)." />
          </div>
          <Select
            label="How is it divided?"
            name="allocationMethod"
            options={ALLOCATION_METHOD_OPTIONS}
            value={allocationMethod}
            onChange={(e) => setAllocationMethod(e.target.value as AllocationMethod)}
          />
          {parkingEligible && (
            <Switch name="includeParkingInAllocation" label="Also bill parking" description="You enter an amount per parking space on the next screen." />
          )}
        </div>
      </details>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

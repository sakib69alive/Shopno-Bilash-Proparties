"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { Project } from "@/content/projects";
import { UNIT_STATUS_LABEL } from "@/content/units";
import { bulkCreateUnits, type UnitContentFormState } from "@/features/unitContent/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Add units
    </Button>
  );
}

const STATUS_OPTIONS = Object.entries(UNIT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

/** Add many units to a project in one go — one unit number per line (or comma-separated). */
export function BulkUnitForm({ projects, initialProject }: { projects: Project[]; initialProject?: string }) {
  const [state, formAction] = useActionState<UnitContentFormState, FormData>(bulkCreateUnits, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Project"
          name="projectSlug"
          required
          options={projects.map((p) => ({ value: p.slug, label: p.name }))}
          defaultValue={initialProject}
          placeholder="Choose a project"
        />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue="available" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Unit Type" name="unitType" required placeholder="e.g. Apartment" />
        <Input
          label="Name prefix (optional)"
          name="namePrefix"
          defaultValue="Unit"
          helperText='Each unit is named "prefix + number", e.g. "Unit A-502".'
        />
      </div>

      <Textarea
        label="Unit numbers"
        name="numbers"
        required
        rows={6}
        placeholder={"A-101\nA-102\nA-201\nA-202"}
      />
      <p className="text-body-sm text-fg-muted -mt-3">
        One per line or separated by commas — up to 200 at a time. Numbers that already exist in the project are skipped.
      </p>

      <fieldset className="border-border flex flex-col gap-5 rounded-md border p-4">
        <legend className="text-label px-1.5">Shared details (all optional)</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Input label="Bedrooms" name="bedrooms" type="number" />
          <Input label="Bathrooms" name="bathrooms" type="number" />
          <Input label="Balconies" name="balconies" type="number" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Input label="Floor" name="floor" type="number" />
          <Input label="Parking Spaces" name="parking" type="number" />
          <Input label="Facing" name="facing" placeholder="e.g. South-East" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Area" name="area" placeholder="e.g. 1,450 sqft" />
          <Input label="Price" name="price" placeholder="Leave blank for “Price on request”" />
        </div>
      </fieldset>

      <p className="text-body-sm text-fg-muted">
        Photos and floor plans can be added to each unit afterwards from its Edit page.
      </p>

      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </form>
  );
}

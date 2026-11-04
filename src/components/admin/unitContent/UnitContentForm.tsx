"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { AdminImageField } from "@/components/admin/settings/AdminImageField";
import { ProjectGalleryField } from "@/components/admin/projectContent/ProjectGalleryField";
import { UNIT_STATUS_LABEL, type Unit } from "@/content/units";
import type { UnitContentFormState } from "@/features/unitContent/actions";
import type { Project } from "@/content/projects";

export interface UnitContentFormProps {
  action: (state: UnitContentFormState, formData: FormData) => Promise<UnitContentFormState>;
  unit?: Unit;
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

const STATUS_OPTIONS = Object.entries(UNIT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

/** Shared by the create and edit admin pages — same shape as Projects CMS's `ProjectContentForm`. */
export function UnitContentForm({ action, unit, projects, submitLabel }: UnitContentFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={unit?.name} placeholder="e.g. Unit A-502" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Project"
          name="projectSlug"
          required
          options={projects.map((p) => ({ value: p.slug, label: p.name }))}
          defaultValue={unit?.projectSlug}
          placeholder="Choose a project"
        />
        <Input label="Unit Number" name="unitNumber" defaultValue={unit?.unitNumber} placeholder="e.g. A-502" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Unit Type" name="unitType" required defaultValue={unit?.unitType} placeholder="e.g. Apartment" />
        <Select
          label="Status"
          name="status"
          required
          options={STATUS_OPTIONS}
          defaultValue={unit?.status}
          placeholder="Choose a status"
        />
      </div>

      <Textarea
        label="Short Description"
        name="shortDescription"
        required
        rows={2}
        defaultValue={unit?.shortDescription}
        placeholder="One or two sentences shown in Properties listings."
      />

      <Textarea
        label="Description"
        name="description"
        required
        rows={5}
        defaultValue={unit?.description}
        placeholder="The full description shown on the unit's own page."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Floor" name="floor" type="number" defaultValue={unit?.floor} />
        <Input label="Bedrooms" name="bedrooms" type="number" defaultValue={unit?.bedrooms} />
        <Input label="Bathrooms" name="bathrooms" type="number" defaultValue={unit?.bathrooms} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Balconies" name="balconies" type="number" defaultValue={unit?.balconies} />
        <Input label="Parking Spaces" name="parking" type="number" defaultValue={unit?.parking} />
        <Input label="Facing" name="facing" defaultValue={unit?.facing} placeholder="e.g. South-East" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Area" name="area" defaultValue={unit?.area} placeholder="e.g. 1,450 sqft or 5 Katha" />
        <Input
          label="Price (optional — leave blank to show “Price on request”)"
          name="price"
          defaultValue={unit?.price}
          placeholder="e.g. ৳1.2 Crore"
        />
      </div>

      <Input
        label="Features / Amenities (comma-separated)"
        name="features"
        defaultValue={unit?.features?.join(", ")}
        placeholder="e.g. Open Kitchen Layout, Private Balcony"
      />

      <fieldset className="border-border flex flex-col gap-5 rounded-md border p-4">
        <legend className="text-label px-1.5">Photos &amp; floor plan</legend>
        <AdminImageField
          label={unit ? "Replace cover photo (optional)" : "Cover photo"}
          name="coverImage"
          currentSrc={unit?.coverImage.src}
          helperText="The main image on the Properties list and the top of the unit page."
        />
        <ProjectGalleryField images={unit?.gallery ?? []} />
        <AdminImageField
          label="Floor plan"
          name="floorPlan"
          removeName="removeFloorPlan"
          currentSrc={unit?.floorPlan?.src}
          helperText="The blueprint shown beside Beds / Baths / Size / Price. JPG, PNG, WEBP or SVG — either one works. Upload only the layout drawing: no background, border or page colour."
          allowSvg
        />
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Media } from "@/components/ui/Media";
import { StructureBuilder } from "@/components/admin/projects/StructureBuilder";
import { UnitTypesField } from "@/components/admin/projects/UnitTypesField";
import type { Project } from "@/types/project";
import type { ProjectFormState } from "@/features/projects/actions";

export interface ProjectFormProps {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  project?: Project;
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
  { value: "upcoming", label: "Upcoming" },
  { value: "planning", label: "Planning" },
  { value: "ongoing", label: "Ongoing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];

const SALES_STATUS_OPTIONS = [
  { value: "not-started", label: "Not Started" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

/** Every business-internal field `types/project.ts` defines — this is the operational record, not the public listing (that's Website CMS's separate Projects form). */
export function ProjectForm({ action, project, submitLabel }: ProjectFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" required defaultValue={project?.name} placeholder="Project name" />
        <Input label="Code" name="code" required defaultValue={project?.code} placeholder="e.g. MER-01" />
      </div>

      <Textarea
        label="Description"
        name="description"
        required
        rows={4}
        defaultValue={project?.description}
        placeholder="Internal description of this project."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Status"
          name="status"
          required
          options={STATUS_OPTIONS}
          defaultValue={project?.status}
          placeholder="Choose a status"
        />
        <Select
          label="Sales Status"
          name="salesStatus"
          required
          options={SALES_STATUS_OPTIONS}
          defaultValue={project?.salesStatus}
          placeholder="Choose a sales status"
        />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Location</h2>
      <Input label="Address" name="address" required defaultValue={project?.address} placeholder="Street address" />
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Area" name="area" defaultValue={project?.area} placeholder="e.g. Gulshan 2" />
        <Input label="City" name="city" required defaultValue={project?.city} placeholder="e.g. Dhaka" />
        <Input label="Postal Code" name="postalCode" defaultValue={project?.postalCode} />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Land</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Land Area (sqft)" name="landAreaSqft" type="number" defaultValue={project?.landAreaSqft} />
        <Input label="Plot Info" name="plotInfo" defaultValue={project?.plotInfo} placeholder="e.g. Plot 12, Road 5" />
        <Input
          label="Ownership Structure"
          name="ownershipStructure"
          defaultValue={project?.ownershipStructure}
          placeholder="e.g. Company-owned"
        />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Building</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Property Type" name="propertyType" required defaultValue={project?.propertyType} placeholder="e.g. Residential" />
        <Input
          label="Amenities (comma-separated)"
          name="amenities"
          defaultValue={project?.amenities.join(", ")}
          placeholder="e.g. Rooftop Garden, Generator Backup"
        />
      </div>
      {project ? (
        <div className="grid gap-5 sm:grid-cols-4">
          <Input label="Buildings" name="buildingCount" type="number" defaultValue={project.buildingCount} />
          <Input label="Floors" name="floorCount" type="number" defaultValue={project.floorCount} />
          <Input label="Units" name="unitCount" type="number" defaultValue={project.unitCount} />
          <Input label="Parking Spaces" name="parkingCount" type="number" defaultValue={project.parkingCount} />
        </div>
      ) : (
        <StructureBuilder />
      )}

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Timeline</h2>
      <div className="grid gap-5 sm:grid-cols-4">
        <Input label="Launch Date" name="launchDate" type="date" defaultValue={project?.launchDate} />
        <Input
          label="Construction Start"
          name="constructionStartDate"
          type="date"
          defaultValue={project?.constructionStartDate}
        />
        <Input
          label="Expected Completion"
          name="expectedCompletionDate"
          type="date"
          defaultValue={project?.expectedCompletionDate}
        />
        <Input label="Handover Date" name="handoverDate" type="date" defaultValue={project?.handoverDate} />
      </div>

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Media</h2>
      {project?.media.coverImage && (
        <Media src={project.media.coverImage} alt="" ratio="standard" radius="md" containerClassName="max-w-xs" sizes="320px" />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Cover Image"
          name="coverImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          helperText={project?.media.coverImage ? "Leave empty to keep the current cover image." : "JPG, PNG or WEBP, up to 15MB."}
        />
        <Input
          label="Gallery Images"
          name="gallery"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          helperText={
            project && project.media.gallery.length > 0
              ? `${project.media.gallery.length} image(s) already in the gallery — new ones are added, not replaced.`
              : "Select one or more images to add to the gallery."
          }
        />
      </div>

      <UnitTypesField initial={project?.unitTypes} />

      <h2 className="text-label text-fg-subtle -mb-2 uppercase">Commercial</h2>
      <Input
        label="Budget (BDT, optional)"
        name="budget"
        type="number"
        defaultValue={project?.budget?.amount}
        placeholder="e.g. 50000000"
      />

      <Switch
        name="isPublished"
        label="Published"
        description="Whether this project is visible on the public website (via the separate Website CMS content, not this record)."
        defaultChecked={project?.isPublished}
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

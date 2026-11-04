"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { ProjectGalleryField } from "./ProjectGalleryField";
import { AdminImageField } from "@/components/admin/settings/AdminImageField";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";
import type { ProjectContentFormState } from "@/features/projectContent/actions";

export interface ProjectUnitStats {
  listed: number;
  available: number;
  manageHref: string;
  bulkHref: string;
}

export interface ProjectContentFormProps {
  unitStats?: ProjectUnitStats;
  action: (state: ProjectContentFormState, formData: FormData) => Promise<ProjectContentFormState>;
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

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => ({ value, label }));
const PROJECT_TYPE_OPTIONS = [
  { value: "Residential", label: "Residential" },
  { value: "Commercial", label: "Commercial" },
  { value: "Land Development", label: "Land Development" },
];

/**
 * Shared by the create and edit admin pages — same shape as CMS Step 1's
 * `NewsArticleForm`. Only the fields worth editing by hand are exposed
 * (`concept`/`nearbyPlaces` are set once on create and left alone on edit).
 * Cover, gallery photos and building blueprints are uploaded here.
 */
export function ProjectContentForm({ action, project, submitLabel, unitStats }: ProjectContentFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      {unitStats && (
        <div className="bg-accent-soft border-border flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3">
          <p className="text-body-sm">
            <span className="font-semibold">{unitStats.listed}</span> {unitStats.listed === 1 ? "unit" : "units"} listed ·{" "}
            <span className="font-semibold">{unitStats.available}</span> available
          </p>
          <div className="flex gap-4">
            <a href={unitStats.manageHref} className="text-button text-accent">
              Manage units
            </a>
            <a href={unitStats.bulkHref} className="text-button text-accent">
              Add units in bulk
            </a>
          </div>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={project?.name} placeholder="Project name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Display Location"
          name="location"
          required
          defaultValue={project?.location}
          placeholder="e.g. Gulshan 2, Dhaka"
        />
        <Input label="City" name="city" required defaultValue={project?.city} placeholder="e.g. Dhaka" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Project Type"
          name="projectType"
          required
          options={PROJECT_TYPE_OPTIONS}
          defaultValue={project?.projectType}
          placeholder="Choose a type"
        />
        <Select
          label="Status"
          name="status"
          required
          options={STATUS_OPTIONS}
          defaultValue={project?.status}
          placeholder="Choose a status"
        />
      </div>

      <Textarea
        label="Short Description"
        name="shortDescription"
        required
        rows={2}
        defaultValue={project?.shortDescription}
        placeholder="One or two sentences shown in Projects listings."
      />

      <Textarea
        label="Description"
        name="description"
        required
        rows={5}
        defaultValue={project?.description}
        placeholder="The full description shown on the project's own page."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input
          label="Completion Year"
          name="completionYear"
          type="number"
          defaultValue={project?.completionYear}
          placeholder="e.g. 2027"
        />
        <Input label="Total Units" name="totalUnits" type="number" defaultValue={project?.totalUnits} />
        <Input label="Available Units (fallback)" name="availableUnits" helperText="Used only until you add units — after that, availability is counted from the units themselves." type="number" defaultValue={project?.availableUnits} />
      </div>

      <div className="grid gap-5 sm:grid-cols-4">
        <Input label="Total Car Parking" name="totalParkingCar" type="number" defaultValue={project?.totalParkingCar} />
        <Input label="Available Car Parking" name="availableParkingCar" type="number" defaultValue={project?.availableParkingCar} />
        <Input label="Total Bike Parking" name="totalParkingBike" type="number" defaultValue={project?.totalParkingBike} />
        <Input
          label="Available Bike Parking"
          name="availableParkingBike"
          type="number"
          defaultValue={project?.availableParkingBike}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Land Area" name="area" defaultValue={project?.area} placeholder="e.g. 1.2 acres" />
        <Input label="Floors" name="floors" type="number" defaultValue={project?.floors} />
        <Input
          label="Building Type"
          name="buildingType"
          defaultValue={project?.buildingType}
          placeholder="e.g. High-rise"
        />
      </div>

      <Input
        label="Unit Types (comma-separated)"
        name="unitTypes"
        defaultValue={project?.unitTypes?.join(", ")}
        placeholder="e.g. 2 Bed, 3 Bed, Duplex"
      />

      <Input
        label="Features / Amenities (comma-separated)"
        name="features"
        defaultValue={project?.features?.join(", ")}
        placeholder="e.g. Rooftop Garden, Underground Parking"
      />

      <Textarea
        label="Location Description (optional)"
        name="locationDescription"
        rows={2}
        defaultValue={project?.locationDescription}
        placeholder="A sentence about the neighborhood."
      />

      <fieldset className="border-border flex flex-col gap-5 rounded-md border p-4">
        <legend className="text-label px-1.5">Photos</legend>
        <AdminImageField
          label={project ? "Replace cover photo (optional)" : "Cover photo"}
          name="coverImage"
          currentSrc={project?.coverImage.src}
          helperText="The main image on the Projects list and the top of the project page."
        />
        <ProjectGalleryField images={project?.gallery ?? []} />
      </fieldset>

      <fieldset className="border-border flex flex-col gap-5 rounded-md border p-4">
        <legend className="text-label px-1.5">Building blueprints (optional)</legend>
        <p className="text-body-sm text-fg-muted -mt-1">
          Shown on the project page as a swipeable set: garage first, then floor, then roof. Add only the ones you have.
        </p>
        <AdminImageField
          label="Garage blueprint"
          name="blueprintGarage"
          removeName="removeBlueprintGarage"
          currentSrc={project?.blueprints?.find((b) => b.kind === "garage")?.image.src}
          helperText="JPG, PNG, WEBP or SVG — either one works. Upload only the layout drawing: no background, border or page colour."
          allowSvg
        />
        <AdminImageField
          label="Floor blueprint"
          name="blueprintFloor"
          removeName="removeBlueprintFloor"
          currentSrc={project?.blueprints?.find((b) => b.kind === "floor")?.image.src}
          helperText="A typical floor, or the plan most floors share. JPG, PNG, WEBP or SVG — either one works. Upload only the layout drawing: no background, border or page colour."
          allowSvg
        />
        <Input
          label="Floor label (optional)"
          name="blueprintFloorLabel"
          defaultValue={project?.blueprints?.find((b) => b.kind === "floor")?.label}
          placeholder="e.g. Typical floor (2–9)"
        />
        <AdminImageField
          label="Roof blueprint"
          name="blueprintRoof"
          removeName="removeBlueprintRoof"
          currentSrc={project?.blueprints?.find((b) => b.kind === "roof")?.image.src}
        />
      </fieldset>

      <Switch
        name="featured"
        label="Featured"
        description="Shown as a featured development on the public Projects page."
        defaultChecked={project?.featured}
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

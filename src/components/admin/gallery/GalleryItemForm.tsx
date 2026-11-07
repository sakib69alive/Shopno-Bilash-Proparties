"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { GALLERY_CATEGORIES, type GalleryItem } from "@/content/gallery";
import type { GalleryFormState } from "@/features/gallery/actions";
import type { Project } from "@/content/projects";

export interface GalleryItemFormProps {
  action: (state: GalleryFormState, formData: FormData) => Promise<GalleryFormState>;
  item?: GalleryItem;
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

const CATEGORY_OPTIONS = GALLERY_CATEGORIES.map((c) => ({ value: c, label: c }));

/** Shared by the create and edit admin pages — `action` is the only thing that differs between them. */
export function GalleryItemForm({ action, item, projects, submitLabel }: GalleryItemFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Title (optional)" name="title" defaultValue={item?.title} placeholder="e.g. Meridian Residences — Facade Study" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Category"
          name="category"
          required
          options={CATEGORY_OPTIONS}
          defaultValue={item?.category}
          placeholder="Choose a category"
        />
        <Input label="Date (optional)" name="date" defaultValue={item?.date} placeholder="e.g. Aug 2026" />
      </div>

      <Input
        label={item ? "Replace Image (optional)" : "Image"}
        name="image"
        type="file"
        required={!item}
        accept=".jpg,.jpeg,.png,.webp"
        helperText={
          item ? `Currently: ${item.image.src.split("/").pop()} — leave empty to keep it.` : "JPG, PNG or WEBP, up to 15MB."
        }
      />

      <Input label="Alt Text" name="alt" required defaultValue={item?.image.alt} placeholder="Describes the image for screen readers" />

      <Textarea label="Caption (optional)" name="caption" rows={2} defaultValue={item?.caption} placeholder="Shown under the image in the lightbox." />

      <Select
        label="Related project (optional)"
        name="projectSlug"
        defaultValue={item?.projectSlug ?? ""}
        options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.slug, label: p.name }))]}
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}

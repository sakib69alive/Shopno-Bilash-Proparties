"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GALLERY_CATEGORIES } from "@/content/gallery";
import type { Project } from "@/content/projects";
import { bulkCreateGalleryItems, type GalleryFormState } from "@/features/gallery/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Upload photos
    </Button>
  );
}

/** Pick many photos at once, give them a shared category / project / date, and upload — with a thumbnail preview of what was chosen. */
export function BulkGalleryForm({ projects }: { projects: Project[] }) {
  const [state, formAction] = useActionState<GalleryFormState, FormData>(bulkCreateGalleryItems, {});
  const [previews, setPreviews] = useState<string[]>([]);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input
        label="Photos"
        name="images"
        type="file"
        multiple
        required
        accept=".jpg,.jpeg,.png,.webp"
        helperText="Select up to 40 at once. JPG, PNG or WEBP; keep the total under about 20MB per upload."
        onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
      />
      {previews.length > 0 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {previews.map((src) => (
            <li key={src} className="border-border bg-surface relative aspect-square overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={src} alt="" className="size-full object-cover" />
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Category"
          name="category"
          required
          options={GALLERY_CATEGORIES.map((c) => ({ value: c, label: c }))}
          placeholder="Choose a category"
        />
        <Input label="Date (optional)" name="date" placeholder="e.g. Aug 2026" />
      </div>
      <Select
        label="Related project (optional)"
        name="projectSlug"
        defaultValue=""
        options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.slug, label: p.name }))]}
      />
      <p className="text-body-sm text-fg-muted">
        Titles and captions can be added to each photo afterwards from its Edit page.
      </p>
      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </PersistForm>
  );
}
